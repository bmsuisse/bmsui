import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface SliderProps extends ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** Accessible names per thumb (e.g. `["Minimum", "Maximum"]`). A single string names every thumb. */
  thumbLabels?: string | string[];
  /** Spoken value per thumb (`aria-valuetext`), e.g. a formatted amount. Only applied with a controlled `value`. */
  getValueText?: (value: number, index: number) => string;
  /**
   * Glide the fill and thumbs to a new value set by keyboard or from outside (150 ms
   * ease-out); dragging always tracks the pointer directly. Off with reduced motion. @default true
   */
  animated?: boolean;
}

/**
 * Radix slider: one thumb per entry in `value` / `defaultValue` (`[50]` single,
 * `[10, 80]` range). Arrow keys step, PageUp/PageDown step ×10, Home/End jump.
 * For a range with typed min/max fields use `RangeSlider`. Thumbs grow
 * slightly on hover and while dragged; keyboard steps glide (`animated`).
 */
export const Slider = forwardRef<ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, thumbLabels, getValueText, value, defaultValue, animated = true, ...props }, ref) => {
    const count = (value ?? defaultValue ?? [0]).length;
    return (
      <SliderPrimitive.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          "group/slider relative flex w-full touch-none select-none items-center py-1.5 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-32 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:px-1.5 data-[orientation=vertical]:py-0",
          // Radix positions each thumb's wrapper span and the range with left/right (bottom/top
          // vertically). Transition those, except while the pointer is down (dragging).
          animated &&
            "[&>span:has(>[role=slider])]:transition-[left,bottom] [&>span:has(>[role=slider])]:duration-150 [&>span:has(>[role=slider])]:ease-out active:[&>span:has(>[role=slider])]:transition-none motion-reduce:[&>span:has(>[role=slider])]:transition-none",
          className,
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted-foreground/20 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5">
          <SliderPrimitive.Range
            className={cn(
              "absolute h-full bg-primary data-[orientation=vertical]:w-full dark:bg-accent",
              animated &&
                "transition-[left,right,top,bottom] duration-150 ease-out group-active/slider:transition-none motion-reduce:transition-none",
            )}
          />
        </SliderPrimitive.Track>
        {Array.from({ length: count }, (_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            aria-label={Array.isArray(thumbLabels) ? thumbLabels[i] : thumbLabels}
            aria-valuetext={getValueText && value?.[i] != null ? getValueText(value[i] as number, i) : undefined}
            className={cn(
              "block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-[box-shadow,scale] duration-150 ease-out dark:border-accent",
              "cursor-grab hover:scale-110 active:scale-110 active:cursor-grabbing group-active/slider:scale-110 motion-reduce:scale-none!",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "data-[disabled]:pointer-events-none",
            )}
          />
        ))}
      </SliderPrimitive.Root>
    );
  },
);
Slider.displayName = "Slider";
