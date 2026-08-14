import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

/**
 * Plain tri-state checkbox (checked / unchecked / `indeterminate`), backed
 * by Radix's own Checkbox primitive rather than a native `<input>` — unlike
 * the native element, Radix exposes `indeterminate` as a first-class
 * `checked` value (`"indeterminate"`) instead of an imperative DOM property
 * a `ref` effect has to poke, and it renders with `role="checkbox"` +
 * `aria-checked="mixed"` for free.
 */
export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // A fixed 3px radius, not the theme's scaled `rounded-sm` — that
      // token is meant for buttons/cards sized well above 16px, and on a
      // box this small it reads as a circle (radio button) instead of a
      // checkbox once an app's `--radius` grows past shadcn's default.
      "peer h-4 w-4 shrink-0 rounded-[3px] border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {props.checked === "indeterminate" ? (
        <Minus className="h-3 w-3" />
      ) : (
        <Check className="h-3 w-3" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
