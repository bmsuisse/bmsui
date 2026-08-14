import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth, subDays } from "date-fns";
import type { ReactElement } from "react";
import type { DateRange } from "react-day-picker";
import type { DateColumn } from "../column/types";
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../lib/utils";
import type { FilterDescriptor } from "./types";
import type { FilterWidgetProps } from "./widget-types";

interface Preset {
  key: string;
  label: string;
  range: (today: Date) => DateRange;
}

const PRESETS: readonly Preset[] = [
  {
    key: "today",
    label: "Today",
    range: (today) => ({ from: startOfDay(today), to: endOfDay(today) }),
  },
  {
    key: "last7",
    label: "Last 7 days",
    range: (today) => ({ from: startOfDay(subDays(today, 6)), to: endOfDay(today) }),
  },
  {
    key: "thisMonth",
    label: "This month",
    range: (today) => ({ from: startOfMonth(today), to: endOfMonth(today) }),
  },
];

function isStringPair(value: unknown): value is [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "string"
  );
}

/**
 * Parses a bound produced by `isoOf`, via date-fns's `parseISO` rather than
 * the bare `new Date(...)` constructor. A bare `"YYYY-MM-DD"` string is
 * parsed by the JS spec as UTC midnight, not local midnight — but `isoOf`
 * serialized it via date-fns `format()` in *local* time, so re-parsing it
 * with `new Date(...)` would shift the displayed day backwards in any
 * timezone behind UTC. `parseISO` treats a date-only string as local
 * midnight, matching how it was serialized (the same fix `evaluate.ts`'s
 * `toEpochMs` applies for filter *evaluation*, sharing this date-fns
 * function instead of a second hand-rolled copy of the same logic).
 */
function parseBound(value: string): Date {
  return parseISO(value);
}

function rangeOf(value: FilterDescriptor | undefined): DateRange | undefined {
  if (!value || value.operator !== "between" || !isStringPair(value.value)) return undefined;
  const from = parseBound(value.value[0]);
  const to = parseBound(value.value[1]);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return undefined;
  return { from, to };
}

/** Serializes a Date as a date-only (`type: "date"`) or full ISO (`type: "datetime"`) string. */
function isoOf(date: Date, columnType: "date" | "datetime"): string {
  return columnType === "datetime" ? date.toISOString() : format(date, "yyyy-MM-dd");
}

/**
 * Default filter widget for `type: "date"` / `type: "datetime"` columns: a
 * date-range picker with Today / Last 7 days / This month presets, plus a
 * calendar for a custom range. Always emits the `between` operator
 * (inclusive both ends, matching evaluateFilter/sql.py/meili.py semantics).
 *
 * `today` defaults to the real current date; it's exposed as a prop purely
 * so tests can pin preset computation to a fixed date without mocking the
 * system clock (and the timer machinery that comes with that).
 *
 * `bare` (default `false`) skips this component's own Popover/trigger
 * Button, rendering just the presets + calendar directly — see
 * `EnumFilter`'s identical `bare` doc for why (`renderDefaultFilterWidget`
 * passes this automatically outside `filterDisplay: "row"`).
 */
export function DateRangeFilter<TRow>({
  column,
  value,
  onChange,
  today = new Date(),
  bare = false,
}: FilterWidgetProps<DateColumn<TRow>> & { today?: Date; bare?: boolean }): ReactElement {
  const range = rangeOf(value);

  function emit(next: DateRange | undefined): void {
    if (!next?.from || !next.to) {
      onChange(undefined);
      return;
    }
    // The presets above already end their range at endOfDay(today); a
    // custom range picked directly from the Calendar does not — clicking a
    // day just returns that day's local midnight, with no time component.
    // For a "date" column that's fine (isoOf drops the time entirely), but
    // for "datetime" it would serialize the end bound as midnight of the
    // selected day, excluding nearly the entire day from the `between`
    // range. Applying endOfDay here (idempotent for the presets, which are
    // already at end-of-day) makes "through this day" the one consistent
    // meaning of the upper bound, regardless of how the range was chosen.
    const to = column.type === "datetime" ? endOfDay(next.to) : next.to;
    onChange({
      field: column.id,
      operator: "between",
      value: [isoOf(next.from, column.type), isoOf(to, column.type)],
    });
  }

  const isFiltered = range?.from !== undefined;
  const summary = range?.from
    ? range.to
      ? `${format(range.from, "PP")} - ${format(range.to, "PP")}`
      : format(range.from, "PP")
    : "";

  const panel = (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => emit(preset.range(today))}
          >
            {preset.label}
          </Button>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => emit(undefined)}>
          Custom
        </Button>
      </div>
      <Calendar mode="range" selected={range} onSelect={emit} numberOfMonths={1} />
    </div>
  );

  if (bare) {
    return <div data-testid={`filter-${column.id}`}>{panel}</div>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1", isFiltered ? "max-w-[220px] px-2" : "w-8 justify-center px-0")}
          aria-label={`Filter ${column.header}`}
          data-testid={`filter-${column.id}`}
        >
          <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          {isFiltered && <span className="truncate">{summary}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">{panel}</PopoverContent>
    </Popover>
  );
}
