import { FunnelIcon } from "@heroicons/react/24/outline";
import type { MouseEvent, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NumberColumn } from "../column/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../lib/utils";
import { descriptorFor, rangeOf } from "./numberRangeShared";
import type { FilterWidgetProps } from "./widget-types";

const BAR_HEIGHT_PX = 56;
const DEFAULT_BUCKETS = 24;

// Signed log transform — spreads skewed financial data (a handful of huge
// values, a long tail of small ones) evenly across the slider/histogram
// instead of every bar but one being invisible; handles negative values.
function tLog(v: number): number {
  return Math.sign(v) * Math.log10(Math.abs(v) + 1);
}
function tInv(t: number): number {
  return Math.sign(t) * (10 ** Math.abs(t) - 1);
}

type NumberHistogramValuesProps =
  | {
      /**
       * The full set of values to compute the histogram and slider domain
       * from.
       *
       * MUST be computed excluding this column's OWN active filter (every
       * other active filter is fine, even expected — see
       * `facetedNumberValues`, which computes exactly this). Passing values
       * already narrowed by this same filter reproduces the bug this
       * component's design exists to prevent: the domain shrinks every time
       * the user adjusts the range, so they can never widen it back out, and
       * (if the same "all rows" array is reused across multiple numeric
       * columns) filtering one column warps every other numeric column's
       * histogram too.
       *
       * Use this (not `loadValues`) whenever the full, facet-safe row set is
       * already in memory — e.g. `<DataGrid>` in `"client"` mode.
       */
      allValues: (number | null | undefined)[];
      loadValues?: never;
    }
  | {
      allValues?: never;
      /**
       * Fetches the histogram/slider domain values on demand, called every
       * time the popover opens (not cached across opens, since every OTHER
       * active filter — which the fetch should itself respect — may have
       * changed since the last time it was open).
       *
       * Use this instead of `allValues` whenever the facet-safe row set
       * ISN'T already in memory — the standard case for `<DataGrid>` in
       * `"server"` mode, where the rows the grid holds are just the current
       * page, already narrowed by every active filter (including this
       * column's own), and therefore never safe to pass as `allValues`
       * directly. Typically this closes over a caller's own "fetch facet
       * values for this column, given every other active filter" endpoint.
       */
      loadValues: () => Promise<(number | null | undefined)[]>;
    };

export type NumberHistogramFilterProps<TRow> = FilterWidgetProps<NumberColumn<TRow>> &
  NumberHistogramValuesProps & {
    /** Formats a bound for display. Defaults to `toLocaleString()`. */
    format?: (value: number) => string;
    /** Number of histogram bars. Defaults to 24. */
    buckets?: number;
    /**
     * Set this to `false` only when the column also sets `filterDisplay:
     * "row"` — there, nothing else provides a trigger, so this needs its
     * own Popover + Button to avoid permanently expanding the histogram
     * inline in the filter row. Defaults to `true` (bare: no own Popover/
     * Button, just the histogram/slider/inputs/clear content) because a
     * custom `BaseColumn.renderFilter` is normally reached for under the
     * *default* `filterDisplay: "popover"`, where `<DataGrid>` already
     * renders a header filter icon that opens a popover around whatever
     * `renderFilter` returns — passing `false` there nests a second,
     * redundant Popover+Button inside the first, so opening the header
     * icon shows nothing but another filter icon to click, not the
     * histogram. There's no `open`/`onOpenChange` state at this level in
     * bare mode — the component simply renders as always-open; the
     * caller's own popover is what mounts/unmounts it.
     */
    bare?: boolean;
  };

/**
 * A richer alternative to the default `NumberRangeFilter`: a log-scale
 * histogram behind a dual-thumb range slider, plus min/max text inputs.
 * Not wired up as any column type's automatic default (unlike
 * `NumberRangeFilter`) — it needs `allValues`/`loadValues` (see above),
 * which the grid itself doesn't have a way to supply automatically yet, so
 * use it directly as a column's custom filter UI (see `BaseColumn.renderFilter`).
 * By default (`bare` unset) this renders bare — just the histogram/slider/
 * inputs, no own trigger/popover — correct under the default `filterDisplay:
 * "popover"`, where `<DataGrid>` already supplies the header filter icon and
 * popover. Pass `bare={false}` when the column also sets `filterDisplay:
 * "row"`, where nothing else provides a trigger. Compute `allValues` via
 * `facetedNumberValues(data, column, filter)` in client mode, or supply
 * `loadValues` to fetch the facet from the server in server mode.
 */
export function NumberHistogramFilter<TRow>({
  column,
  value,
  onChange,
  allValues,
  loadValues,
  format = (v) => v.toLocaleString(),
  buckets = DEFAULT_BUCKETS,
  bare = true,
}: NumberHistogramFilterProps<TRow>): ReactElement {
  const [openState, setOpen] = useState(false);
  // In bare mode there's no trigger of our own to toggle this -- the caller's
  // own popover controls whether this component is even mounted, so treat it
  // as permanently "open" internally (drives the value-computation/resync
  // effects below the same way a real open transition would).
  const open = bare || openState;
  const trackRef = useRef<HTMLDivElement>(null);
  const [minOnTop, setMinOnTop] = useState(false);
  const [loadedValues, setLoadedValues] = useState<(number | null | undefined)[]>([]);
  const [loading, setLoading] = useState(false);

  const { min, max } = rangeOf(value);

  // `loadValues` re-fetches on every open (not just the first) -- every
  // OTHER active filter it should itself respect may have changed since the
  // popover was last open, and it's cheap to only pay for this while the
  // control is actually visible.
  useEffect(() => {
    if (!open || !loadValues) return;
    let cancelled = false;
    setLoading(true);
    loadValues()
      .then((values) => {
        if (!cancelled) setLoadedValues(values);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loadValues]);

  const sourceValues = allValues ?? loadedValues;

  // O(n) histogram/domain scan only while the popover is actually open —
  // it's not visible (and its values aren't needed for anything else; the
  // closed trigger's label reads `min`/`max` directly, not the domain)
  // while closed, and this can run against a full unfiltered column of
  // however many rows the grid holds.
  const nums = useMemo(
    () => (open ? sourceValues.filter((v): v is number => v != null) : []),
    [sourceValues, open],
  );
  const dataMin = useMemo(() => nums.reduce((a, b) => Math.min(a, b), Infinity), [nums]);
  const dataMax = useMemo(() => nums.reduce((a, b) => Math.max(a, b), -Infinity), [nums]);

  const activeMin = min ?? dataMin;
  const activeMax = max ?? dataMax;

  // Local text state for the min/max boxes, resynced fresh each time the
  // popover opens (see the effect below) rather than derived straight from
  // `activeMin`/`activeMax` on every render. Deriving directly would mean
  // every keystroke round-trips through emit -> onChange -> the clamped/
  // rounded committed number -> back into the input's `value` — so typing
  // "150" character by character re-renders the box to "1", then "15", but
  // interleaved with whatever userEvent.clear() or cursor-position quirks
  // occur along the way corrupts the result (verified: this exact direct-
  // binding shape, ported faithfully from the original ad hoc version this
  // component replaces, produced "499" instead of "150" in a plain typing
  // test). `NumberRangeFilter` avoids the same class of bug the same way,
  // for the same reason — see its own docstring.
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");

  useEffect(() => {
    if (!open) return;
    setMinText(Number.isFinite(activeMin) ? String(Math.round(activeMin)) : "");
    setMaxText(Number.isFinite(activeMax) ? String(Math.round(activeMax)) : "");
    // Intentionally resyncs on the open transition and on `loading`
    // flipping false (so a `loadValues` fetch's result populates the boxes
    // once it actually resolves — at the moment `open` first becomes true,
    // an in-flight fetch's `sourceValues` is still `[]`), but not on every
    // activeMin/activeMax change while open otherwise — typing itself
    // drives those via handleMinChange/handleMaxChange below, and
    // re-deriving text from the committed (rounded, clamped) number on
    // every keystroke is exactly the corruption local state exists to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading]);

  const logDataMin = Number.isFinite(dataMin) ? tLog(dataMin) : 0;
  const logDataMax = Number.isFinite(dataMax) ? tLog(dataMax) : 1;
  const logStep = (logDataMax - logDataMin) / 200;

  const logPct = useCallback(
    (v: number) => (logDataMax === logDataMin ? 0 : ((tLog(v) - logDataMin) / (logDataMax - logDataMin)) * 100),
    [logDataMin, logDataMax],
  );

  const histBars = useMemo(() => {
    if (!nums.length || dataMin === dataMax || !Number.isFinite(dataMin) || !Number.isFinite(dataMax)) return [];
    const step = (logDataMax - logDataMin) / buckets;
    const counts = Array<number>(buckets).fill(0);
    for (const v of nums) {
      const i = Math.min(Math.floor((tLog(v) - logDataMin) / step), buckets - 1);
      counts[i] = (counts[i] ?? 0) + 1;
    }
    const peak = Math.max(...counts);
    return counts.map((count, i) => ({
      count,
      heightPx: peak > 0 ? Math.max((count / peak) * BAR_HEIGHT_PX, 2) : 2,
      active: tInv(logDataMin + i * step) < activeMax && tInv(logDataMin + (i + 1) * step) > activeMin,
    }));
  }, [nums, dataMin, dataMax, logDataMin, logDataMax, buckets, activeMin, activeMax]);

  function emit(nextMin: number | undefined, nextMax: number | undefined): void {
    onChange(
      descriptorFor(column.id, {
        min: nextMin !== undefined && nextMin <= dataMin ? undefined : nextMin,
        max: nextMax !== undefined && nextMax >= dataMax ? undefined : nextMax,
      }),
    );
  }

  function handleMinChange(actual: number): void {
    emit(Math.min(actual, activeMax - 1), max);
  }

  function handleMaxChange(actual: number): void {
    emit(min, Math.max(actual, activeMin + 1));
  }

  function handleTrackHover(event: MouseEvent<HTMLDivElement>): void {
    if (!trackRef.current || !Number.isFinite(dataMin) || !Number.isFinite(dataMax)) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const logHover = logDataMin + ratio * (logDataMax - logDataMin);
    setMinOnTop(Math.abs(logHover - tLog(activeMin)) <= Math.abs(logHover - tLog(activeMax)));
  }

  const isFiltered = value !== undefined;
  const summary = isFiltered ? `${format(activeMin)} – ${format(activeMax)}` : "";

  const panel = (
    <div className={bare ? "flex w-full flex-col gap-3" : "flex w-80 flex-col gap-3"}>
      {loading && (
        <p className="text-xs text-muted-foreground" data-testid={`filter-${column.id}-loading`}>
          Loading…
        </p>
      )}
      <div className="flex items-end gap-px" style={{ height: BAR_HEIGHT_PX }} data-testid={`filter-${column.id}-histogram`}>
        {histBars.map((bar, i) => (
          <div
            key={i}
            className={cn("flex-1 rounded-sm", bar.active ? "bg-primary/70" : "bg-muted-foreground/20")}
            style={{ height: bar.heightPx }}
          />
        ))}
      </div>

      <div ref={trackRef} className="relative h-5" onMouseMove={handleTrackHover}>
        <input
          type="range"
          aria-label={`${column.header} minimum (slider)`}
          min={logDataMin}
          max={logDataMax}
          step={logStep}
          value={tLog(activeMin)}
          onChange={(event) => handleMinChange(tInv(Number.parseFloat(event.target.value)))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          style={{ zIndex: minOnTop ? 5 : 3 }}
        />
        <input
          type="range"
          aria-label={`${column.header} maximum (slider)`}
          min={logDataMin}
          max={logDataMax}
          step={logStep}
          value={tLog(activeMax)}
          onChange={(event) => handleMaxChange(tInv(Number.parseFloat(event.target.value)))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          style={{ zIndex: minOnTop ? 3 : 5 }}
        />
        <div className="pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-muted">
          <div
            className="absolute h-full rounded-full bg-primary"
            style={{ left: `${logPct(activeMin)}%`, right: `${100 - logPct(activeMax)}%` }}
          />
        </div>
        {[activeMin, activeMax].map((v, i) => (
          <div
            key={i}
            className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow"
            style={{ left: `${logPct(v)}%` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          aria-label={`${column.header} minimum`}
          value={minText}
          onChange={(event) => {
            setMinText(event.target.value);
            const parsed = Number.parseFloat(event.target.value.replace(/[^0-9.-]/g, ""));
            if (!Number.isNaN(parsed)) handleMinChange(parsed);
          }}
        />
        <span className="shrink-0 text-xs text-muted-foreground">to</span>
        <Input
          type="text"
          inputMode="numeric"
          aria-label={`${column.header} maximum`}
          value={maxText}
          onChange={(event) => {
            setMaxText(event.target.value);
            const parsed = Number.parseFloat(event.target.value.replace(/[^0-9.-]/g, ""));
            if (!Number.isNaN(parsed)) handleMaxChange(parsed);
          }}
        />
      </div>

      {isFiltered && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
          Clear
        </Button>
      )}
    </div>
  );

  if (bare) {
    return <div data-testid={`filter-${column.id}`}>{panel}</div>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1", isFiltered ? "max-w-[200px] px-2" : "w-8 justify-center px-0")}
          aria-label={`Filter ${column.header}`}
          data-testid={`filter-${column.id}`}
        >
          <FunnelIcon
            className={cn("h-3.5 w-3.5 shrink-0", isFiltered ? "opacity-100 text-primary" : "opacity-40")}
            aria-hidden
          />
          {isFiltered && <span className="truncate">{summary}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">{panel}</PopoverContent>
    </Popover>
  );
}
