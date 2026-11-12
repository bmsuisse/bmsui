import { type ReactElement, useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { DateRangePicker } from "../date-range-picker/DateRangePicker";
import { RangeSlider } from "../range-slider/RangeSlider";

/** Config of a `type: "range"` facet. */
export interface FacetRangeConfig {
  min: number;
  max: number;
  /** @default 1 */
  step?: number;
  /** Unit after the typed inputs and in the chip text (`CHF`, `Stück`). */
  unit?: string;
  decimals?: number;
  locale?: string;
  /**
   * Counts per equal-width bucket from `min` to `max`, drawn as bars above the slider (like a price
   * histogram). Bars outside the chosen range are dimmed.
   */
  histogram?: number[];
}

/** Config of a `type: "dateRange"` facet. ISO days. */
export interface FacetDateRangeConfig {
  min?: string;
  max?: string;
  locale?: string;
}

/**
 * A range travels in the facet's `string[]` as one entry `"low..high"`, with an empty end for "no
 * bound" (`"10.."`, `"..99"`, `"2026-01-01..2026-03-31"`). One entry keeps `countActiveFacets` and
 * the chips counting it once.
 */
export function formatFacetRange(low: string | number | undefined, high: string | number | undefined): string {
  return `${low ?? ""}..${high ?? ""}`;
}

/** Splits a `"low..high"` entry into its two (possibly empty) ends. */
export function parseFacetRange(entry: string | undefined): [string, string] {
  if (!entry) return ["", ""];
  const at = entry.indexOf("..");
  return at < 0 ? [entry, ""] : [entry.slice(0, at), entry.slice(at + 2)];
}

const toNumber = (text: string, fallback: number): number => {
  const parsed = text === "" ? Number.NaN : Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
};

interface RangeBodyProps {
  config: FacetRangeConfig;
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  animated?: boolean;
  labels: { min: string; max: string };
}

/** Histogram + two-thumb slider + typed bounds for a numeric facet. Commits when a drag ends or a typed bound is accepted. */
export function RangeFacetBody({ config, selected, onSelectedChange, animated, labels }: RangeBodyProps): ReactElement {
  const [lowText, highText] = parseFacetRange(selected[0]);
  const committed: [number, number] = [toNumber(lowText, config.min), toNumber(highText, config.max)];
  const [draft, setDraft] = useState<[number, number]>(committed);
  // Follows the caller's value (reset, chip removal) but not our own in-flight drag.
  useEffect(() => {
    setDraft([toNumber(lowText, config.min), toNumber(highText, config.max)]);
  }, [lowText, highText, config.min, config.max]);

  const commit = ([low, high]: [number, number]): void => {
    if (low <= config.min && high >= config.max) return onSelectedChange([]);
    onSelectedChange([formatFacetRange(low <= config.min ? "" : low, high >= config.max ? "" : high)]);
  };

  const bars = config.histogram;
  const peak = bars ? Math.max(1, ...bars) : 1;
  const span = config.max - config.min || 1;

  return (
    <div className="space-y-2 px-1.5 pt-1">
      {bars && bars.length > 0 && (
        <div aria-hidden="true" className="flex h-14 items-end gap-px px-2.5">
          {bars.map((count, index) => {
            const middle = config.min + ((index + 0.5) / bars.length) * span;
            const inside = middle >= draft[0] && middle <= draft[1];
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: buckets are positional
                key={index}
                className={cn(
                  "flex-1 rounded-t-[1px] transition-colors duration-150 motion-reduce:transition-none",
                  inside ? "bg-foreground/55" : "bg-foreground/15",
                )}
                style={{ height: `${Math.max(count > 0 ? 6 : 0, (count / peak) * 100)}%` }}
              />
            );
          })}
        </div>
      )}
      <RangeSlider
        value={draft}
        onValueChange={setDraft}
        onValueCommit={commit}
        min={config.min}
        max={config.max}
        step={config.step}
        unit={config.unit}
        decimals={config.decimals}
        locale={config.locale}
        animated={animated}
        labels={labels}
      />
    </div>
  );
}

interface DateRangeBodyProps {
  config: FacetDateRangeConfig | undefined;
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  animated?: boolean;
}

/** `DateRangePicker` for a date facet. */
export function DateRangeFacetBody({ config, selected, onSelectedChange }: DateRangeBodyProps): ReactElement {
  const [from, to] = parseFacetRange(selected[0]);
  return (
    <div className="px-1.5">
      <DateRangePicker
        size="sm"
        value={{ from, to }}
        min={config?.min}
        max={config?.max}
        locale={config?.locale}
        onValueChange={(range) =>
          onSelectedChange(range.from === "" && range.to === "" ? [] : [formatFacetRange(range.from, range.to)])
        }
      />
    </div>
  );
}
