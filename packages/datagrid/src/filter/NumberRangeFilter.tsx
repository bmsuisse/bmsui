import { FunnelIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { defaultFormat } from "../column/format";
import type { NumberColumn } from "../column/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../lib/utils";
import { descriptorFor, rangeOf } from "./numberRangeShared";
import type { FilterDescriptor } from "./types";
import type { FilterWidgetProps } from "./widget-types";

function parseNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Default filter widget for `type: "number"` / `type: "currency"` columns: a
 * min/max range. Emits `between` when both bounds are set (reordered so the
 * lower bound is always <= the upper bound), or `gte`/`lte` when only one
 * is — all three are evaluated identically by evaluateFilter and sql.py/
 * meili.py.
 *
 * The two input boxes track their own local text rather than deriving
 * straight from `value` on every render. If they derived from `value`
 * directly, reordering an inverted min/max (see above) would relocate
 * whatever the user just typed into the *other* box on the very next
 * render — so typing "99" into Min then "9" then "9" into Max (intending
 * "99") would see Max flip to "99" after the first "9" (since a swap makes
 * it the new max), and the second "9" would land in the now-relocated box,
 * producing "909" instead of "99". Keeping local text means what's on
 * screen always matches exactly what was typed, independent of how the
 * emitted FilterDescriptor's bounds get reordered.
 *
 * `bare` (default `false`) skips this component's own Popover/trigger
 * Button, rendering just the two inputs directly — see `EnumFilter`'s
 * identical `bare` doc for why (`renderDefaultFilterWidget` passes this
 * automatically outside `filterDisplay: "row"`). Under `filterDisplay:
 * "row"`, the min/max boxes are always visible at their natural width
 * regardless of a narrower column — wrapping them in a compact trigger
 * (bare: false) is what keeps a plain numeric column from forcing its whole
 * column wider than its data ever needs.
 */
export function NumberRangeFilter<TRow>({
  column,
  value,
  onChange,
  bare = false,
}: FilterWidgetProps<NumberColumn<TRow>> & { bare?: boolean }): ReactElement {
  const initial = rangeOf(value);
  const [minText, setMinText] = useState(initial.min?.toString() ?? "");
  const [maxText, setMaxText] = useState(initial.max?.toString() ?? "");
  const minId = useId();
  const maxId = useId();

  // Tracks the exact descriptor object this widget itself last passed to
  // onChange, so the effect below can tell "value changed because we edited
  // it" (skip — local text is already right, and re-deriving it would
  // reintroduce the swap-corruption bug documented above) apart from
  // "value changed for some other reason" — a caller-driven clear-all-
  // filters, or restoring a different filter entirely (e.g. loading a saved
  // view), both of which this widget would otherwise never notice since it
  // normally drives `value` itself.
  const lastEmittedRef = useRef<FilterDescriptor | undefined>(value);

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    const next = rangeOf(value);
    setMinText(next.min?.toString() ?? "");
    setMaxText(next.max?.toString() ?? "");
  }, [value]);

  function emit(nextMinText: string, nextMaxText: string): void {
    const next = descriptorFor(column.id, {
      min: parseNumber(nextMinText),
      max: parseNumber(nextMaxText),
    });
    lastEmittedRef.current = next;
    onChange(next);
  }

  const { min, max } = rangeOf(value);
  const isFiltered = min !== undefined || max !== undefined;
  const summary =
    min !== undefined && max !== undefined
      ? `${defaultFormat(column, min)} – ${defaultFormat(column, max)}`
      : min !== undefined
        ? `≥ ${defaultFormat(column, min)}`
        : max !== undefined
          ? `≤ ${defaultFormat(column, max)}`
          : "";

  const panel = (
    <div className="flex w-full max-w-[220px] items-center gap-2">
      <Input
        id={minId}
        type="number"
        aria-label={`${column.header} minimum`}
        placeholder="Min"
        className="min-w-0"
        value={minText}
        onChange={(event) => {
          setMinText(event.target.value);
          emit(event.target.value, maxText);
        }}
      />
      <span className="shrink-0 text-xs text-muted-foreground">to</span>
      <Input
        id={maxId}
        type="number"
        aria-label={`${column.header} maximum`}
        placeholder="Max"
        className="min-w-0"
        value={maxText}
        onChange={(event) => {
          setMaxText(event.target.value);
          emit(minText, event.target.value);
        }}
      />
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
          className={cn("gap-1", isFiltered ? "max-w-[180px] px-2" : "w-8 justify-center px-0")}
          aria-label={`Filter ${column.header}`}
          data-testid={`filter-${column.id}`}
        >
          <FunnelIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          {isFiltered && <span className="truncate">{summary}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">{panel}</PopoverContent>
    </Popover>
  );
}
