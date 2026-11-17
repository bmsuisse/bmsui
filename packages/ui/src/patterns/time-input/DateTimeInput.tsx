import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { popoverMotion } from "../../lib/popoverMotion";
import { toTime, usesHour12 } from "../../lib/timeField";
import { cn } from "../../lib/utils";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import type { CalendarProps } from "../calendar/Calendar";
import { CalendarLoader, preloadCalendar } from "../calendar/CalendarLoader";
import { DateInput } from "../date-input/DateInput";
import { DateInputMessage, type DateInputError, defaultDateInputLabels, toDay } from "../date-input/shared";
import { InputGroup, InputGroupButton } from "../input-group/InputGroup";
import { defaultTimeInputLabels, TimeInput, type TimeInputError } from "./TimeInput";

type PassThroughCalendarProps = Pick<CalendarProps, "isDateDisabled" | "weekStartsOn" | "today" | "animated">;

export interface DateTimeInputLabels {
  /** Message for a date that is no date. */
  invalidDate: string;
  /** Message for a day before `min` or after `max`. */
  dateOutOfRange: string;
  /** Message for a day that `isDateDisabled` blocks. */
  dateUnavailable: string;
  /** Message for a time that is no time. */
  invalidTime: string;
  /** Message for a time before `min` or after `max` on the first/last day. */
  timeOutOfRange: string;
  /** Accessible names of the two fields. */
  date: string;
  time: string;
  /** Accessible name of the calendar button. */
  openCalendar: string;
  previousMonth: string;
  nextMonth: string;
  calendarLoadFailed: string;
  retry: string;
}

export const defaultDateTimeInputLabels: DateTimeInputLabels = {
  invalidDate: defaultDateInputLabels.invalid,
  dateOutOfRange: defaultDateInputLabels.outOfRange,
  dateUnavailable: defaultDateInputLabels.unavailable,
  invalidTime: defaultTimeInputLabels.invalid,
  timeOutOfRange: defaultTimeInputLabels.outOfRange,
  date: "Date",
  time: "Time",
  openCalendar: "Choose date",
  previousMonth: defaultDateInputLabels.previousMonth,
  nextMonth: defaultDateInputLabels.nextMonth,
  calendarLoadFailed: defaultDateInputLabels.calendarLoadFailed,
  retry: defaultDateInputLabels.retry,
};

export interface DateTimeInputProps extends PassThroughCalendarProps {
  /** Local ISO datetime `yyyy-mm-ddTHH:mm` (no zone, no seconds), or `""` for none. */
  value: string;
  /** Called with `yyyy-mm-ddTHH:mm` (or `""` when the date is cleared). Fires once both parts are real, within `min`/`max`. */
  onValueChange: (iso: string) => void;
  /** Called when either field becomes (in)valid; `reason` is the first error of the two. */
  onInvalidChange?: (invalid: boolean, reason?: DateInputError | TimeInputError) => void;
  /** Display and parse order of the date and the clock. Default `de-CH` (dd.mm.yyyy, 14:30). */
  locale?: string;
  /** Earliest allowed local ISO datetime (the time part is only enforced on that day; a day alone, `2026-11-01`, means from 00:00). */
  min?: string;
  /** Latest allowed local ISO datetime (a day alone means up to 23:59). */
  max?: string;
  /** Minutes ArrowUp/ArrowDown move the time by. @default 1 */
  step?: number;
  /** Time used when only a date was entered, and when the time is cleared. @default "00:00" */
  defaultTime?: string;
  disabled?: boolean;
  readOnly?: boolean;
  size?: "sm" | "default";
  /** Form field name for a hidden input carrying the ISO datetime. */
  name?: string;
  /** Portal target of the calendar popover. Pass the Dialog/Sheet content element when used inside one. */
  container?: HTMLElement | null;
  /** Shows the error text under the field when an entry is rejected. @default true */
  showError?: boolean;
  labels?: Partial<DateTimeInputLabels>;
  className?: string;
  /** Id(s) of an element describing the field (a hint); joined with the error message id on both fields. */
  "aria-describedby"?: string;
  "data-testid"?: string;
}

const testId = (id: unknown, suffix: string) => (typeof id === "string" ? `${id}-${suffix}` : undefined);

/**
 * A date and a time field in one box (a `DateInput` and a `TimeInput`, both `bare`) plus a
 * calendar popover. The value is a local ISO datetime, `yyyy-mm-ddTHH:mm`, never UTC (see
 * `toLocalIsoDateTime`). Each part commits like its own field (blur/Enter, same parsing,
 * messages and `onInvalidChange`). Typing a date alone fills the time with `defaultTime`;
 * a time typed before any date waits until there is a date. `min`/`max` are datetimes:
 * the time is only restricted on the first/last day, and a time that becomes
 * out of range when the day changes is moved to the nearest allowed one.
 */
export function DateTimeInput({
  value,
  onValueChange,
  onInvalidChange,
  locale = "de-CH",
  min,
  max,
  step,
  defaultTime = "00:00",
  disabled,
  readOnly,
  size = "default",
  name,
  container,
  showError = true,
  labels,
  className,
  isDateDisabled,
  weekStartsOn,
  today,
  animated = true,
  ...props
}: DateTimeInputProps): ReactElement {
  const l = { ...defaultDateTimeInputLabels, ...labels };
  const [date, setDate] = useState(toDay(value));
  const [time, setTime] = useState(toTime(value));
  const [errors, setErrors] = useState<{ date: DateInputError | null; time: TimeInputError | null }>({ date: null, time: null });
  const errorsRef = useRef(errors);
  const reported = useRef<string | null>(null);
  const lastEmitted = useRef(value);
  const dateRef = useRef<HTMLInputElement>(null);
  const focusInputOnClose = useRef(false);
  const [open, setOpen] = useState(false);
  const [timeSync, setTimeSync] = useState(0);
  const messageId = useId();
  const id = props["data-testid"];
  const locked = disabled || readOnly;

  // Outside changes (a reset, a saved value arriving) replace both parts; our own emits don't.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setDate(toDay(value));
    setTime(toTime(value));
  }, [value]);

  const minDay = toDay(min);
  const maxDay = toDay(max);
  const minTime = min && min.length > 10 && date === minDay ? toTime(min) : "";
  const maxTime = max && max.length > 10 && date === maxDay ? toTime(max) : "";

  /** Both parts present: clamp into min/max, then emit. */
  const publish = (nextDate: string, nextTime: string) => {
    setDate(nextDate);
    if (!nextDate) {
      setTime(nextTime);
      lastEmitted.current = "";
      if (value) onValueChange("");
      return;
    }
    let combined = `${nextDate}T${nextTime || toTime(defaultTime) || "00:00"}`;
    const lo = min && min.length > 10 ? min.slice(0, 16) : "";
    const hi = max && max.length > 10 ? max.slice(0, 16) : "";
    if (lo && combined < lo) combined = lo;
    if (hi && combined > hi) combined = hi;
    setTime(combined.slice(11));
    // The box was emptied and refilled with the default: remount it, since `value` may not have changed (no resync).
    if (!nextTime) setTimeSync((n) => n + 1);
    lastEmitted.current = combined;
    if (combined !== value) onValueChange(combined);
  };

  const report = (part: "date" | "time") => (invalid: boolean, reason?: DateInputError | TimeInputError) => {
    const next = { ...errorsRef.current, [part]: invalid ? (reason ?? "invalid") : null } as typeof errors;
    errorsRef.current = next;
    setErrors(next);
    const any = next.date ?? next.time;
    const key = next.date ? `date:${next.date}` : next.time ? `time:${next.time}` : null;
    if (key === reported.current) return;
    reported.current = key;
    onInvalidChange?.(any != null, any ?? undefined);
  };

  const message = errors.date
    ? errors.date === "invalid"
      ? l.invalidDate
      : errors.date === "range"
        ? l.dateOutOfRange
        : l.dateUnavailable
    : errors.time
      ? errors.time === "invalid"
        ? l.invalidTime
        : l.timeOutOfRange
      : "";
  const showMessage = showError && message !== "";
  const describedBy = [props["aria-describedby"], showMessage ? messageId : undefined].filter(Boolean).join(" ") || undefined;
  const wide = usesHour12(locale);

  const field = "h-full min-w-0 flex-none rounded-none border-0 bg-transparent pb-[5px] shadow-none focus-visible:ring-0 tabular-nums";
  const px = size === "sm" ? "px-2.5 text-xs" : "px-3";

  return (
    <div className={className}>
      <Popover open={open && !locked} onOpenChange={(next) => setOpen(next && !locked)}>
        <PopoverAnchor asChild>
          <InputGroup size={size} data-testid={id ?? "date-time-input"}>
            <DateInput
              bare
              ref={dateRef}
              aria-label={l.date}
              aria-describedby={describedBy}
              value={date}
              onValueChange={(next) => publish(next, time)}
              onInvalidChange={report("date")}
              locale={locale}
              min={minDay || undefined}
              max={maxDay || undefined}
              isDateDisabled={isDateDisabled}
              disabled={disabled}
              readOnly={readOnly}
              className={cn(field, px, "w-[calc(9.5ch+1.25rem)] pr-1.5", size === "sm" && "w-[calc(9.5ch+1rem)]")}
              data-testid={testId(id, "date")}
            />
            <span aria-hidden="true" className="h-4 w-px shrink-0 bg-foreground/10 dark:bg-border" />
            <TimeInput
              key={timeSync}
              bare
              aria-label={l.time}
              aria-describedby={describedBy}
              value={time}
              onValueChange={(next) => publish(date, next)}
              onInvalidChange={report("time")}
              locale={locale}
              min={minTime || undefined}
              max={maxTime || undefined}
              step={step}
              disabled={disabled}
              readOnly={readOnly}
              className={cn(field, px, "pl-2", wide ? "w-[calc(8.5ch+1.25rem)]" : "w-[calc(5.5ch+1.25rem)]")}
              data-testid={testId(id, "time")}
            />
            <span className="flex-1" />
            <PopoverTrigger asChild>
              <InputGroupButton
                aria-label={l.openCalendar}
                disabled={locked}
                onPointerEnter={preloadCalendar}
                onFocus={preloadCalendar}
                data-testid={testId(id, "calendar-button")}
              >
                <CalendarDaysIcon aria-hidden="true" />
              </InputGroupButton>
            </PopoverTrigger>
          </InputGroup>
        </PopoverAnchor>
        <PopoverContent
          container={container}
          aria-label={l.openCalendar}
          className={popoverMotion(animated)}
          align="end"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            if (!focusInputOnClose.current) return;
            focusInputOnClose.current = false;
            e.preventDefault();
            dateRef.current?.focus();
          }}
        >
          <CalendarLoader
            loadFailed={l.calendarLoadFailed}
            retryLabel={l.retry}
            autoFocus
            value={date}
            onValueChange={(iso) => {
              publish(iso, time);
              focusInputOnClose.current = true;
              setOpen(false);
            }}
            locale={locale}
            min={minDay || undefined}
            max={maxDay || undefined}
            isDateDisabled={isDateDisabled}
            weekStartsOn={weekStartsOn}
            today={today}
            animated={animated}
            labels={{ previousMonth: l.previousMonth, nextMonth: l.nextMonth }}
            data-testid={testId(id, "calendar")}
          />
        </PopoverContent>
      </Popover>
      {showMessage ? <DateInputMessage id={messageId} message={message} /> : null}
      {name ? <input type="hidden" name={name} value={date && time ? `${date}T${time}` : ""} /> : null}
    </div>
  );
}
