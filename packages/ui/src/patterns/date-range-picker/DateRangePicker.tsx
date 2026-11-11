import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { useId, useRef, useState } from "react";
import { popoverMotion } from "../../lib/popoverMotion";
import { cn } from "../../lib/utils";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import type { CalendarProps, DateRange } from "../calendar/Calendar";
import { CalendarLoader, preloadCalendar } from "../calendar/CalendarLoader";
import { DateInput } from "../date-input/DateInput";
import {
  DateInputMessage,
  type DateInputError,
  type DateInputLabels,
  defaultDateInputLabels,
  errorMessage,
  useCoarsePointer,
} from "../date-input/shared";
import { InputGroup, InputGroupButton } from "../input-group/InputGroup";

type PassThroughCalendarProps = Pick<CalendarProps, "isDateDisabled" | "weekStartsOn" | "today" | "animated">;

const triggerTestId = (testId: unknown, suffix: string) => (typeof testId === "string" ? `${testId}-${suffix}` : undefined);

export interface DateRangePickerLabels
  extends Pick<
    DateInputLabels,
    "invalid" | "outOfRange" | "unavailable" | "previousMonth" | "nextMonth" | "calendarLoadFailed" | "retry"
  > {
  openCalendar: string;
  from: string;
  to: string;
}

export const defaultDateRangePickerLabels: DateRangePickerLabels = {
  invalid: defaultDateInputLabels.invalid,
  outOfRange: defaultDateInputLabels.outOfRange,
  unavailable: defaultDateInputLabels.unavailable,
  previousMonth: defaultDateInputLabels.previousMonth,
  nextMonth: defaultDateInputLabels.nextMonth,
  calendarLoadFailed: defaultDateInputLabels.calendarLoadFailed,
  retry: defaultDateInputLabels.retry,
  openCalendar: "Choose dates",
  from: "From",
  to: "To",
};

export interface DateRangePickerProps extends PassThroughCalendarProps {
  /** `{ from, to }` as ISO days, `""` for an open end. */
  value: DateRange;
  /** Called with an ordered range once an end is committed or the calendar picks one. Only real days within `min`/`max` and not blocked by `isDateDisabled` get here. */
  onValueChange: (range: DateRange) => void;
  /** Called when either field becomes (in)valid; `reason` as in `DateInput`. */
  onInvalidChange?: (invalid: boolean, reason?: DateInputError) => void;
  locale?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  /** Fields and calendar can be read but not changed. */
  readOnly?: boolean;
  size?: "sm" | "default";
  /** Form field names for hidden inputs carrying the ISO days. */
  name?: { from: string; to: string };
  /** Portal target of the calendar popover. Pass the Dialog/Sheet content element when used inside one. */
  container?: HTMLElement | null;
  /**
   * `auto` (default): touch devices (`pointer: coarse`) get the browser's own date inputs for "from"
   * and "to" right away, other devices the typed fields with the range calendar. `always` / `never`
   * force one of them. Same idea as `DateInput`.
   */
  native?: "auto" | "always" | "never";
  /** Shows the error text under the field when an entry is rejected. @default true */
  showError?: boolean;
  labels?: Partial<DateRangePickerLabels>;
  className?: string;
  "data-testid"?: string;
}

/**
 * Two typed day fields ("from – to") in one box plus a calendar popover that
 * picks the range with two clicks. Each end commits like `DateInput` (same
 * parsing, `min`/`max`, `isDateDisabled`, error message and `onInvalidChange`);
 * a typed `from` after `to` (or the reverse) swaps them. Touch devices get the
 * browser's own date inputs instead (`native`). The calendar loads lazily. Use
 * it for period filters and validity ranges. Same popover/calendar motion as
 * `DateInput picker="calendar"` (`animated`).
 */
export function DateRangePicker({
  value,
  onValueChange,
  onInvalidChange,
  locale = "de-CH",
  min,
  max,
  disabled,
  readOnly,
  size = "default",
  name,
  container,
  native = "auto",
  showError = true,
  labels,
  className,
  isDateDisabled,
  weekStartsOn,
  today,
  animated = true,
  ...props
}: DateRangePickerProps): ReactElement {
  const l = { ...defaultDateRangePickerLabels, ...labels };
  const coarse = useCoarsePointer();
  const useNative = native === "always" || (native === "auto" && coarse);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | null>(null);
  const [errors, setErrors] = useState<{ from: DateInputError | null; to: DateInputError | null }>({ from: null, to: null });
  // Both fields can report in the same tick (e.g. both cleared by an outside reset): merge into the
  // latest errors, not the ones of the render that created the callback.
  const errorsRef = useRef(errors);
  const reported = useRef<DateInputError | null>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const focusInputOnClose = useRef(false);
  const messageId = useId();
  const testId = props["data-testid"];
  // Read-only means no editing at all: the calendar must not open and change the range either.
  const locked = disabled || readOnly;

  const commit = (next: DateRange) => {
    const ordered = next.from && next.to && next.to < next.from ? { from: next.to, to: next.from } : next;
    onValueChange(ordered);
  };

  const report = (end: "from" | "to") => (invalid: boolean, reason?: DateInputError) => {
    const next = { ...errorsRef.current, [end]: invalid ? (reason ?? "invalid") : null };
    errorsRef.current = next;
    setErrors(next);
    const any = next.from ?? next.to;
    // Only tell the parent when the aggregate changes.
    if (any === reported.current) return;
    reported.current = any;
    onInvalidChange?.(any != null, any ?? undefined);
  };
  const message = errorMessage(errors.from ?? errors.to, l);
  const showMessage = showError && message !== "";
  const describedBy = showMessage ? messageId : undefined;

  const messageEl = showMessage ? <DateInputMessage id={messageId} message={message} /> : null;

  if (useNative) {
    const nativeField = (end: "from" | "to") => (
      <DateInput
        native="always"
        aria-label={end === "from" ? l.from : l.to}
        aria-describedby={describedBy}
        value={value[end]}
        onValueChange={(next) => commit({ ...value, [end]: next })}
        onInvalidChange={report(end)}
        min={min}
        max={max}
        isDateDisabled={isDateDisabled}
        disabled={disabled}
        readOnly={readOnly}
        name={name?.[end]}
        showError={false}
        className="min-w-0 flex-1"
        data-testid={triggerTestId(testId, end)}
      />
    );
    return (
      <div className={className} data-testid={testId ?? "date-range-picker"}>
        <div className="flex items-center gap-2">
          {nativeField("from")}
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">
            –
          </span>
          {nativeField("to")}
        </div>
        {messageEl}
      </div>
    );
  }

  // Each field is as wide as its text (`field-sizing: content`, else a fixed width that fits
  // dd.mm.yyyy), so the dash sits evenly between the two dates; the spacer pushes the button right.
  const field = cn(
    "h-full min-w-0 flex-none rounded-none border-0 bg-transparent pb-[5px] shadow-none focus-visible:ring-0",
    "tabular-nums supports-[field-sizing:content]:w-auto supports-[field-sizing:content]:[field-sizing:content]",
    size === "sm" ? "px-2.5 text-xs" : "px-3",
  );

  return (
    <div className={className}>
      <Popover
        open={open && !locked}
        onOpenChange={(next) => {
          setOpen(next && !locked);
          setDraft(null);
        }}
      >
        <PopoverAnchor asChild>
          <InputGroup size={size} data-testid={testId ?? "date-range-picker"}>
            <DateInput
              bare
              ref={fromRef}
              aria-label={l.from}
              aria-describedby={describedBy}
              value={value.from}
              onValueChange={(from) => commit({ ...value, from })}
              onInvalidChange={report("from")}
              locale={locale}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              disabled={disabled}
              readOnly={readOnly}
              name={name?.from}
              className={cn(field, "w-[calc(9.5ch+1.25rem)] pr-1.5", size === "sm" && "w-[calc(9.5ch+1rem)]")}
              data-testid={triggerTestId(testId, "from")}
            />
            <span aria-hidden="true" className="shrink-0 text-muted-foreground">
              –
            </span>
            <DateInput
              bare
              aria-label={l.to}
              aria-describedby={describedBy}
              value={value.to}
              onValueChange={(to) => commit({ ...value, to })}
              onInvalidChange={report("to")}
              locale={locale}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              disabled={disabled}
              readOnly={readOnly}
              name={name?.to}
              className={cn(field, "w-[calc(9.5ch+0.75rem)] pl-1.5 pr-1.5", size === "sm" && "w-[calc(9.5ch+0.75rem)] pl-1.5")}
              data-testid={triggerTestId(testId, "to")}
            />
            <span className="flex-1" />
            <PopoverTrigger asChild>
              <InputGroupButton
                aria-label={l.openCalendar}
                disabled={locked}
                onPointerEnter={preloadCalendar}
                onFocus={preloadCalendar}
                data-testid={triggerTestId(testId, "calendar-button")}
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
            fromRef.current?.focus();
          }}
        >
          <CalendarLoader
          loadFailed={l.calendarLoadFailed}
          retryLabel={l.retry}
            mode="range"
            autoFocus
            value={draft ?? value}
            onValueChange={(range) => {
              if (range.from && range.to) {
                setDraft(null);
                onValueChange(range);
                focusInputOnClose.current = true;
                setOpen(false);
              } else {
                setDraft(range);
              }
            }}
            locale={locale}
            min={min}
            max={max}
            isDateDisabled={isDateDisabled}
            weekStartsOn={weekStartsOn}
            today={today}
            animated={animated}
            labels={{ previousMonth: l.previousMonth, nextMonth: l.nextMonth }}
            data-testid={triggerTestId(testId, "calendar")}
          />
        </PopoverContent>
      </Popover>
      {messageEl}
    </div>
  );
}
