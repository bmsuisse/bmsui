import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import type { KeyboardEvent, ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  dayOfWeek,
  longDayLabel,
  monthGrid,
  monthTitle,
  startOfMonth,
  weekdayNames,
  weekStartOf,
} from "../../lib/calendar";
import { toLocalIsoDay } from "../../lib/dateField";
import { cn } from "../../lib/utils";

/** A day range as ISO days; `""` for an open end. */
export interface DateRange {
  from: string;
  to: string;
}

export interface CalendarLabels {
  previousMonth: string;
  nextMonth: string;
}

export const defaultCalendarLabels: CalendarLabels = {
  previousMonth: "Previous month",
  nextMonth: "Next month",
};

interface CalendarBaseProps {
  /** Earliest selectable ISO day. */
  min?: string;
  /** Latest selectable ISO day. */
  max?: string;
  /** Extra per-day rule (holidays, weekends…); return true to disable the day. */
  isDateDisabled?: (iso: string) => boolean;
  /** Month names, weekday names and week start. @default "de-CH" */
  locale?: string;
  /** Override the locale's first day of week, 0 = Sunday … 6 = Saturday. */
  weekStartsOn?: number;
  /** Shown month (any ISO day in it), for a controlled month. */
  month?: string;
  /** Called when the shown month changes, with its first day. */
  onMonthChange?: (month: string) => void;
  /** Month shown first when `month` is not controlled. Defaults to the selected day, else today. */
  defaultMonth?: string;
  /** Focus the selected (or today's) day on mount — set when opening in a popover. */
  autoFocus?: boolean;
  /** "Today" for the marker and the default month. @default local today */
  today?: string;
  labels?: Partial<CalendarLabels>;
  className?: string;
  "data-testid"?: string;
}

export interface CalendarSingleProps extends CalendarBaseProps {
  mode?: "single";
  /** Selected ISO day, `""` for none. */
  value: string;
  onValueChange: (iso: string) => void;
}

export interface CalendarRangeProps extends CalendarBaseProps {
  mode: "range";
  value: DateRange;
  /** Called after each click: first with `{ from, to: "" }`, then with the full range (ordered). */
  onValueChange: (range: DateRange) => void;
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

const clampIso = (iso: string, min?: string, max?: string) =>
  min && iso < min ? min : max && iso > max ? max : iso;

/**
 * Month grid for picking a day or a day range. Values are ISO days. Keyboard:
 * arrows move by day/week, PageUp/PageDown by month (Shift: year), Home/End to
 * the week's start/end, Enter/Space selects. Week start, month and weekday
 * names follow `locale` (Monday first in de-CH). Usually you want `DatePicker`
 * / `DateRangePicker`, which put this in a popover next to a typed field; use
 * `Calendar` directly for an always-visible picker.
 */
export function Calendar(props: CalendarProps): ReactElement {
  const {
    isDateDisabled,
    locale = "de-CH",
    weekStartsOn,
    month: controlledMonth,
    onMonthChange,
    defaultMonth,
    autoFocus,
    labels,
    className,
  } = props;
  const l = { ...defaultCalendarLabels, ...labels };
  // Compare ISO days only, so ISO datetimes (`2026-11-05T00:00:00`) work too.
  const min = props.min?.slice(0, 10);
  const max = props.max?.slice(0, 10);
  const today = (props.today ?? toLocalIsoDay(new Date())).slice(0, 10);
  const range = props.mode === "range" ? { from: props.value.from.slice(0, 10), to: props.value.to.slice(0, 10) } : null;
  const single = props.mode === "range" ? "" : props.value.slice(0, 10);
  const anchor = range ? range.from || range.to : single;

  const [uncontrolledMonth, setUncontrolledMonth] = useState(() =>
    startOfMonth(defaultMonth || anchor || clampIso(today, min, max)),
  );
  const shownMonth = controlledMonth ? startOfMonth(controlledMonth) : uncontrolledMonth;
  const setMonth = (iso: string) => {
    const next = startOfMonth(iso);
    if (next === shownMonth) return;
    if (!controlledMonth) setUncontrolledMonth(next);
    onMonthChange?.(next);
  };

  const [focusDay, setFocusDay] = useState(() => clampIso(anchor || today, min, max));
  const [hoverDay, setHoverDay] = useState("");
  const gridRef = useRef<HTMLTableElement>(null);
  const shouldFocus = useRef(Boolean(autoFocus));

  // Keep the roving tab stop inside the shown month.
  const activeDay = focusDay.slice(0, 7) === shownMonth.slice(0, 7) ? focusDay : clampIso(
    anchor.slice(0, 7) === shownMonth.slice(0, 7) ? anchor : today.slice(0, 7) === shownMonth.slice(0, 7) ? today : shownMonth,
    min,
    max,
  );

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${activeDay}"]`)?.focus();
  });

  const weekStart = weekStartsOn ?? weekStartOf(locale);
  const weeks = useMemo(() => monthGrid(shownMonth, weekStart), [shownMonth, weekStart]);
  const names = useMemo(() => weekdayNames(locale, weekStart), [locale, weekStart]);
  const longNames = useMemo(() => weekdayNames(locale, weekStart, "long"), [locale, weekStart]);

  const isDisabled = (iso: string) =>
    Boolean((min && iso < min) || (max && iso > max) || isDateDisabled?.(iso));

  const moveFocus = (iso: string) => {
    const next = clampIso(iso, min, max);
    // Clamped onto the day that already has focus: nothing re-renders, so don't leave a
    // pending focus request that a later, unrelated render would act on.
    if (next === activeDay) return;
    setFocusDay(next);
    setMonth(next);
    shouldFocus.current = true;
  };

  const select = (iso: string) => {
    if (isDisabled(iso)) return;
    setFocusDay(iso);
    if (iso.slice(0, 7) !== shownMonth.slice(0, 7)) {
      setMonth(iso);
      shouldFocus.current = true;
    }
    if (props.mode === "range") {
      const { from, to } = range ?? { from: "", to: "" };
      if (!from || to) props.onValueChange({ from: iso, to: "" });
      else props.onValueChange(iso < from ? { from: iso, to: from } : { from, to: iso });
    } else {
      props.onValueChange(iso);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const day = activeDay;
    const keys: Record<string, () => string> = {
      ArrowLeft: () => addDays(day, -1),
      ArrowRight: () => addDays(day, 1),
      ArrowUp: () => addDays(day, -7),
      ArrowDown: () => addDays(day, 7),
      PageUp: () => addMonths(day, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(day, e.shiftKey ? 12 : 1),
      Home: () => addDays(day, -((dayOfWeek(day) - weekStart + 7) % 7)),
      End: () => addDays(day, 6 - ((dayOfWeek(day) - weekStart + 7) % 7)),
    };
    const target = keys[e.key];
    if (!target) return;
    e.preventDefault();
    moveFocus(target());
  };

  // Range preview while the second end is being picked.
  const rangeFrom = range?.from ?? "";
  const rangeTo = range ? range.to || (range.from && hoverDay ? hoverDay : "") : "";
  const [lo, hi] = rangeFrom && rangeTo && rangeTo < rangeFrom ? [rangeTo, rangeFrom] : [rangeFrom, rangeTo];

  const prevDisabled = Boolean(min && addDays(shownMonth, -1) < min);
  const nextDisabled = Boolean(max && addMonths(shownMonth, 1) > max);
  const navButton =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

  return (
    <div
      data-testid={props["data-testid"] ?? "calendar"}
      className={cn("w-fit select-none p-3 text-sm", className)}
      onMouseLeave={() => setHoverDay("")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className={navButton}
          aria-label={l.previousMonth}
          disabled={prevDisabled}
          onClick={() => setMonth(addMonths(shownMonth, -1))}
        >
          <ChevronLeftIcon aria-hidden="true" className="h-4 w-4" />
        </button>
        <div aria-live="polite" className="text-sm font-semibold text-foreground">
          {monthTitle(shownMonth, locale)}
        </div>
        <button
          type="button"
          className={navButton}
          aria-label={l.nextMonth}
          disabled={nextDisabled}
          onClick={() => setMonth(addMonths(shownMonth, 1))}
        >
          <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <table ref={gridRef} role="grid" aria-label={monthTitle(shownMonth, locale)} className="border-collapse" onKeyDown={onKeyDown}>
        <thead>
          <tr>
            {names.map((name, i) => (
              <th
                key={name + i}
                scope="col"
                abbr={longNames[i]}
                className="h-8 w-9 text-center text-xs font-medium text-muted-foreground"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((iso) => {
                const outside = iso.slice(0, 7) !== shownMonth.slice(0, 7);
                const outOfBounds = Boolean((min && iso < min) || (max && iso > max));
                const blocked = !outOfBounds && Boolean(isDateDisabled?.(iso));
                const disabled = outOfBounds || blocked;
                const isStart = range ? iso === lo && Boolean(lo) : false;
                const isEnd = range ? iso === hi && Boolean(hi) : false;
                const inRange = Boolean(range && lo && hi && iso > lo && iso < hi);
                const selected = range ? (iso === range.from || iso === range.to) && Boolean(iso) : iso === single;
                const isToday = iso === today;
                return (
                  <td
                    key={iso}
                    role="gridcell"
                    aria-selected={selected || inRange || undefined}
                    className={cn(
                      "p-0 text-center",
                      inRange && "bg-accent/15",
                      isStart && hi && hi !== lo && "rounded-l-md bg-gradient-to-r from-transparent from-50% to-accent/15 to-50%",
                      isEnd && lo && hi !== lo && "rounded-r-md bg-gradient-to-l from-transparent from-50% to-accent/15 to-50%",
                    )}
                  >
                    <button
                      type="button"
                      data-day={iso}
                      tabIndex={iso === activeDay ? 0 : -1}
                      // aria-disabled, not disabled: keyboard focus may still land on (and pass) a blocked day.
                      aria-disabled={disabled || undefined}
                      aria-label={longDayLabel(iso, locale)}
                      aria-current={isToday ? "date" : undefined}
                      aria-pressed={selected}
                      onClick={() => select(iso)}
                      onMouseEnter={() => range && setHoverDay(iso)}
                      onFocus={() => {
                        setFocusDay(iso);
                        if (range) setHoverDay(iso);
                      }}
                      className={cn(
                        "relative inline-flex h-9 w-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                        disabled && "cursor-not-allowed text-muted-foreground/40",
                        blocked && "line-through",
                        !disabled && (outside ? "text-muted-foreground/60" : "text-foreground"),
                        !selected && !disabled && "hover:bg-muted-foreground/10",
                        isToday && "font-semibold",
                        selected && "bg-primary font-medium text-primary-foreground hover:bg-primary/90 dark:bg-accent dark:hover:bg-accent/90",
                        (isStart || isEnd) && !selected && "bg-primary/80 text-primary-foreground dark:bg-accent/80",
                      )}
                    >
                      {Number(iso.slice(8, 10))}
                      {isToday ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                            selected ? "bg-primary-foreground" : "bg-foreground",
                          )}
                        />
                      ) : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
