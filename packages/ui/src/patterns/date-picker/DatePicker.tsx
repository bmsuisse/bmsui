import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { forwardRef, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { Calendar, type CalendarProps, type DateRange } from "../calendar/Calendar";
import { DateInput, type DateInputProps } from "../date-input/DateInput";
import { InputGroup, InputGroupButton } from "../input-group/InputGroup";

export interface DatePickerLabels {
  openCalendar: string;
  previousMonth: string;
  nextMonth: string;
}

export const defaultDatePickerLabels: DatePickerLabels = {
  openCalendar: "Choose date",
  previousMonth: "Previous month",
  nextMonth: "Next month",
};

type PassThroughCalendarProps = Pick<CalendarProps, "isDateDisabled" | "weekStartsOn" | "today" | "animated">;

// Enter: fade + scale from the trigger side (Radix sets the transform origin). The exit is
// instant — Radix unmounts on close and only waits for CSS keyframe animations, which this
// package doesn't ship.
const popoverMotion = (animated: boolean) =>
  cn(
    "w-auto p-0",
    animated &&
      "origin-(--radix-popover-content-transform-origin) transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0 motion-reduce:starting:scale-100",
  );

export interface DatePickerProps extends Omit<DateInputProps, "size">, PassThroughCalendarProps {
  /** `sm` = h-8. @default "default" */
  size?: "sm" | "default";
  /** Class for the wrapping group. `className` styles the `<input>`. */
  wrapperClassName?: string;
  /** Portal target for the calendar popover — pass the Dialog/Sheet content element when used inside one. */
  container?: HTMLElement | null;
  labels?: Partial<DatePickerLabels>;
}

const triggerTestId = (testId: unknown, suffix: string) => (typeof testId === "string" ? `${testId}-${suffix}` : undefined);

/**
 * `DateInput` with a calendar button: type `3.2.26` or pick from a month grid
 * in a popover. Same ISO-day value, commit and invalid behaviour as
 * `DateInput`; `min`/`max` limit both the typed and the picked day. Use it for
 * any date field where people may not know the exact date by heart; keep plain
 * `DateInput` for dense tables. `ref` and input props go to the `<input>`.
 * The calendar popover fades and scales in from the button (150 ms ease-out,
 * no scale with reduced motion); `animated={false}` turns this and the
 * calendar's own motion off.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    { value, onValueChange, locale = "de-CH", min, max, isDateDisabled, weekStartsOn, today, animated = true, size = "default", wrapperClassName, container, labels, className, disabled, ...props },
    ref,
  ) => {
    const l = { ...defaultDatePickerLabels, ...labels };
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    // After a pick, focus goes back to the typed field instead of the calendar button.
    const focusInputOnClose = useRef(false);
    const testId = (props as Record<string, unknown>)["data-testid"];

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <InputGroup size={size} className={wrapperClassName} data-testid={triggerTestId(testId, "group") ?? "date-picker"}>
            <DateInput
              ref={(node) => {
                inputRef.current = node;
                if (typeof ref === "function") ref(node);
                else if (ref) ref.current = node;
              }}
              {...props}
              value={value}
              onValueChange={onValueChange}
              locale={locale}
              min={min}
              max={max}
              disabled={disabled}
              className={cn(
                "h-full flex-1 rounded-none border-0 bg-transparent pb-[5px] pr-1 shadow-none focus-visible:ring-0",
                size === "sm" && "px-2.5 text-xs",
                className,
              )}
            />
            <PopoverTrigger asChild>
              <InputGroupButton aria-label={l.openCalendar} disabled={disabled} data-testid={triggerTestId(testId, "calendar-button")}>
                <CalendarDaysIcon aria-hidden="true" />
              </InputGroupButton>
            </PopoverTrigger>
          </InputGroup>
        </PopoverAnchor>
        <PopoverContent
          container={container}
          className={popoverMotion(animated)}
          align="end"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            if (!focusInputOnClose.current) return;
            focusInputOnClose.current = false;
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Calendar
            autoFocus
            value={value}
            onValueChange={(iso) => {
              onValueChange(iso);
              focusInputOnClose.current = true;
              setOpen(false);
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
    );
  },
);
DatePicker.displayName = "DatePicker";

export interface DateRangePickerLabels extends DatePickerLabels {
  from: string;
  to: string;
}

export const defaultDateRangePickerLabels: DateRangePickerLabels = {
  ...defaultDatePickerLabels,
  openCalendar: "Choose dates",
  from: "From",
  to: "To",
};

export interface DateRangePickerProps extends PassThroughCalendarProps {
  /** `{ from, to }` as ISO days, `""` for an open end. */
  value: DateRange;
  onValueChange: (range: DateRange) => void;
  locale?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  /** Form field names for hidden inputs carrying the ISO days. */
  name?: { from: string; to: string };
  container?: HTMLElement | null;
  labels?: Partial<DateRangePickerLabels>;
  className?: string;
  "data-testid"?: string;
}

/**
 * Two typed day fields ("from – to") in one box plus a calendar popover that
 * picks the range with two clicks. Each end commits like `DateInput`; a typed
 * `from` after `to` (or the reverse) swaps them. Use it for period filters and
 * validity ranges. Same popover/calendar motion as `DatePicker` (`animated`).
 */
export function DateRangePicker({
  value,
  onValueChange,
  locale = "de-CH",
  min,
  max,
  disabled,
  size = "default",
  name,
  container,
  labels,
  className,
  isDateDisabled,
  weekStartsOn,
  today,
  animated = true,
  ...props
}: DateRangePickerProps): ReactElement {
  const l = { ...defaultDateRangePickerLabels, ...labels };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | null>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const focusInputOnClose = useRef(false);
  const testId = props["data-testid"];

  const commit = (next: DateRange) => {
    const ordered = next.from && next.to && next.to < next.from ? { from: next.to, to: next.from } : next;
    onValueChange(ordered);
  };
  // Each field is as wide as its text (`field-sizing: content`, else a fixed width that fits
  // dd.mm.yyyy), so the dash sits evenly between the two dates; the spacer pushes the button right.
  const field = cn(
    "h-full min-w-0 flex-none rounded-none border-0 bg-transparent pb-[5px] shadow-none focus-visible:ring-0",
    "tabular-nums supports-[field-sizing:content]:w-auto supports-[field-sizing:content]:[field-sizing:content]",
    size === "sm" ? "px-2.5 text-xs" : "px-3",
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setDraft(null);
      }}
    >
      <PopoverAnchor asChild>
        <InputGroup size={size} className={className} data-testid={testId ?? "date-range-picker"}>
          <DateInput
            ref={fromRef}
            aria-label={l.from}
            value={value.from}
            onValueChange={(from) => commit({ ...value, from })}
            locale={locale}
            min={min}
            max={max}
            disabled={disabled}
            name={name?.from}
            className={cn(field, "w-[calc(9.5ch+1.25rem)] pr-1.5", size === "sm" && "w-[calc(9.5ch+1rem)]")}
            data-testid={triggerTestId(testId, "from")}
          />
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">
            –
          </span>
          <DateInput
            aria-label={l.to}
            value={value.to}
            onValueChange={(to) => commit({ ...value, to })}
            locale={locale}
            min={min}
            max={max}
            disabled={disabled}
            name={name?.to}
            className={cn(field, "w-[calc(9.5ch+0.75rem)] pl-1.5 pr-1.5", size === "sm" && "w-[calc(9.5ch+0.75rem)] pl-1.5")}
            data-testid={triggerTestId(testId, "to")}
          />
          <span className="flex-1" />
          <PopoverTrigger asChild>
            <InputGroupButton aria-label={l.openCalendar} disabled={disabled} data-testid={triggerTestId(testId, "calendar-button")}>
              <CalendarDaysIcon aria-hidden="true" />
            </InputGroupButton>
          </PopoverTrigger>
        </InputGroup>
      </PopoverAnchor>
      <PopoverContent
        container={container}
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
        <Calendar
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
  );
}
