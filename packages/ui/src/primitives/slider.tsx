import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface SliderProps extends ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** Accessible names per thumb (e.g. `["Minimum", "Maximum"]`). A single string names every thumb. */
  thumbLabels?: string | string[];
  /** Spoken value per thumb (`aria-valuetext`), e.g. a formatted amount. Only applied with a controlled `value`. */
  getValueText?: (value: number, index: number) => string;
}

/**
 * Radix slider: one thumb per entry in `value` / `defaultValue` (`[50]` single,
 * `[10, 80]` range). Arrow keys step, PageUp/PageDown step ×10, Home/End jump.
 * For a range with typed min/max fields use `RangeSlider`.
 */
export const Slider = forwardRef<ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, thumbLabels, getValueText, value, defaultValue, ...props }, ref) => {
    const count = (value ?? defaultValue ?? [0]).length;
    return (
      <SliderPrimitive.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          "relative flex w-full touch-none select-none items-center py-1.5 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-32 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:px-1.5 data-[orientation=vertical]:py-0",
          className,
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted-foreground/20 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5">
          <SliderPrimitive.Range className="absolute h-full bg-primary data-[orientation=vertical]:w-full dark:bg-accent" />
        </SliderPrimitive.Track>
        {Array.from({ length: count }, (_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            aria-label={Array.isArray(thumbLabels) ? thumbLabels[i] : thumbLabels}
            aria-valuetext={getValueText && value?.[i] != null ? getValueText(value[i] as number, i) : undefined}
            className={cn(
              "block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-[box-shadow,transform] dark:border-accent",
              "hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
              "data-[disabled]:pointer-events-none",
            )}
          />
        ))}
      </SliderPrimitive.Root>
    );
  },
);
Slider.displayName = "Slider";
