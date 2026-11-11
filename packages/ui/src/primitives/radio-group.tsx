import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

/** Radix radio group root (arrow keys, one tab stop). Lay items out yourself, or use `RadioList`. */
export const RadioGroup = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

/** One radio circle. Pair it with a `Label htmlFor`. Same size and checked fill as `Checkbox`. The fill cross-fades and the dot scales in (150 ms ease-out; no scale with reduced motion). */
export const RadioGroupItem = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Item>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "peer inline-flex aspect-square h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 bg-background shadow-sm transition-[color,background-color,border-color,box-shadow] duration-150 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      "enabled:hover:border-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary dark:data-[state=checked]:border-accent dark:data-[state=checked]:bg-accent",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground transition-transform duration-150 ease-out starting:scale-0 motion-reduce:transition-none" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = "RadioGroupItem";
