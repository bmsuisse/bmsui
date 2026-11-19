import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface SliderProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  /** Called when a drag or keyboard step ends. */
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  minStepsBetweenThumbs?: number;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  name?: string;
  form?: string;
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
 * Slider: one thumb per entry in `value` / `defaultValue` (`[50]` single,
 * `[10, 80]` range). Arrow keys step, PageUp/PageDown step ×10, Home/End jump.
 * For a range with typed min/max fields use `RangeSlider`. Thumbs grow
 * slightly on hover and while dragged; keyboard steps glide (`animated`).
 */
export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      thumbLabels,
      getValueText,
      value,
      defaultValue,
      onValueChange,
      onValueCommit,
      step = 1,
      minStepsBetweenThumbs,
      orientation,
      animated = true,
      ...props
    },
    ref,
  ) => {
    const count = (value ?? defaultValue ?? [0]).length;
    return (
      <SliderPrimitive.Root
        ref={ref}
        value={value}
        // Radix always worked in arrays; Base UI switches to a plain number without one.
        defaultValue={value === undefined ? (defaultValue ?? [props.min ?? 0]) : undefined}
        onValueChange={onValueChange && ((next) => onValueChange(toArray(next)))}
        onValueCommitted={onValueCommit && ((next) => onValueCommit(toArray(next)))}
        step={step}
        largeStep={step * 10}
        minStepsBetweenValues={minStepsBetweenThumbs}
        orientation={orientation}
        className={cn(
          "group/slider relative flex w-full touch-none select-none items-center py-1.5 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-32 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:px-1.5 data-[orientation=vertical]:py-0",
          className,
        )}
        {...props}
      >
        <SliderPrimitive.Control className="relative flex w-full grow items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-[var(--radius-pill,9999px)] bg-muted-foreground/20 ring-1 ring-inset ring-muted-foreground/70 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5">
            <SliderPrimitive.Indicator
              className={cn(
                "h-full bg-primary data-[orientation=vertical]:w-full dark:bg-accent",
                animated &&
                  "transition-[inset-inline-start,width,bottom,height] duration-150 ease-out group-active/slider:transition-none motion-reduce:transition-none",
              )}
            />
          </SliderPrimitive.Track>
          {/* Thumbs move on a rail inset by half a thumb, so they stay within the track at min and max like Radix's
              (Base UI's own `thumbAlignment="edge"` measures layout and hides the thumbs where there is none, e.g. jsdom). */}
          <div className={cn("absolute", orientation === "vertical" ? "inset-x-0 inset-y-2" : "inset-x-2 inset-y-0")}>
            {Array.from({ length: count }, (_, i) => (
              <SliderPrimitive.Thumb
                key={i}
                index={i}
                aria-label={Array.isArray(thumbLabels) ? thumbLabels[i] : thumbLabels}
                aria-valuetext={getValueText && value?.[i] != null ? getValueText(value[i] as number, i) : undefined}
                className={cn(
                  "block h-4 w-4 rounded-[var(--radius-pill,9999px)] border-2 border-primary bg-background shadow-sm duration-150 ease-out dark:border-accent",
                  // Position glides only when animated, and never while the pointer is down (dragging).
                  animated
                    ? "transition-[box-shadow,scale,inset-inline-start,bottom] group-active/slider:transition-[box-shadow,scale] motion-reduce:transition-[box-shadow,scale]"
                    : "transition-[box-shadow,scale]",
                  "cursor-grab hover:scale-110 active:scale-110 active:cursor-grabbing group-active/slider:scale-110 motion-reduce:scale-none!",
                  "has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-background",
                  "data-[disabled]:pointer-events-none",
                )}
              />
            ))}
          </div>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    );
  },
);
Slider.displayName = "Slider";

const toArray = (value: number | readonly number[]) => (Array.isArray(value) ? [...value] : [value as number]);
