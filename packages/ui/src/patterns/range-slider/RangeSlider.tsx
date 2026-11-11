import type { ReactElement } from "react";
import { formatLocaleNumber } from "../../lib/numberField";
import { cn } from "../../lib/utils";
import { Slider } from "../../primitives/slider";
import { NumberInput } from "../number-input/NumberInput";

export interface RangeSliderLabels {
  min: string;
  max: string;
}

export const defaultRangeSliderLabels: RangeSliderLabels = {
  min: "Minimum",
  max: "Maximum",
};

export interface RangeSliderProps {
  /** `[low, high]`, both within `min`…`max`. */
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  /** Called when a drag ends or a typed bound commits — use it for expensive refetches. */
  onValueCommit?: (value: [number, number]) => void;
  min: number;
  max: number;
  /** @default 1 */
  step?: number;
  /** Smallest gap between the two thumbs, in steps. @default 0 */
  minStepsBetween?: number;
  /** Show typed min/max `NumberInput`s under the track. @default true */
  showInputs?: boolean;
  /** Format for the inputs (and the thumbs' `aria-valuetext`). @default "de-CH" */
  locale?: string;
  /** Fixed decimals in the inputs. */
  decimals?: number;
  /** Unit shown after each input (`CHF`, `%`). */
  unit?: string;
  disabled?: boolean;
  /** Let the fill and thumbs glide to typed or keyboard-stepped bounds (see `Slider`). @default true */
  animated?: boolean;
  labels?: Partial<RangeSliderLabels>;
  className?: string;
  "data-testid"?: string;
}

/**
 * Two-thumb slider for a numeric range filter (price, area, quantity) with
 * typed min/max fields underneath, kept in sync: drag for a rough range, type
 * for an exact bound. A typed low above the high (or the reverse) is clamped to
 * the other bound. For a single value use the `Slider` primitive. A typed
 * bound glides the thumb to its new place (`animated`).
 */
export function RangeSlider({
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step = 1,
  minStepsBetween = 0,
  showInputs = true,
  locale = "de-CH",
  decimals,
  unit,
  disabled,
  animated = true,
  labels,
  className,
  ...props
}: RangeSliderProps): ReactElement {
  const l = { ...defaultRangeSliderLabels, ...labels };
  const testId = props["data-testid"];
  const [low, high] = value;
  const gap = minStepsBetween * step;

  const setBound = (index: 0 | 1, typed: number | null) => {
    let next: [number, number];
    if (index === 0) next = [Math.min(typed ?? min, high - gap), high];
    else next = [low, Math.max(typed ?? max, low + gap)];
    onValueChange(next);
    onValueCommit?.(next);
  };

  const input = (index: 0 | 1) => (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <NumberInput
        size="sm"
        aria-label={index === 0 ? l.min : l.max}
        value={value[index]}
        onValueChange={(v) => setBound(index, v)}
        min={min}
        max={max}
        step={step}
        decimals={decimals}
        locale={locale}
        disabled={disabled}
        data-testid={testId ? `${testId}-${index === 0 ? "min" : "max"}-input` : undefined}
      />
      {unit ? <span className="shrink-0 text-xs text-muted-foreground">{unit}</span> : null}
    </div>
  );

  return (
    <div data-testid={testId ?? "range-slider"} className={cn("flex w-full flex-col gap-3", className)}>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={minStepsBetween}
        disabled={disabled}
        animated={animated}
        thumbLabels={[l.min, l.max]}
        getValueText={(v) => formatLocaleNumber(v, locale, { decimals })}
        onValueChange={(v) => onValueChange([v[0] ?? min, v[1] ?? max])}
        onValueCommit={(v) => onValueCommit?.([v[0] ?? min, v[1] ?? max])}
      />
      {showInputs ? (
        <div className="flex items-center gap-2">
          {input(0)}
          <span aria-hidden="true" className="text-muted-foreground">
            –
          </span>
          {input(1)}
        </div>
      ) : null}
    </div>
  );
}
