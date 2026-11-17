import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon, MinusIcon } from "@heroicons/react/24/outline";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-[min(3px,var(--radius,0.625rem))] border border-muted-foreground/70 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary dark:data-[state=checked]:border-ring dark:data-[state=indeterminate]:border-ring dark:data-[state=checked]:bg-accent dark:data-[state=checked]:text-accent-foreground dark:data-[state=indeterminate]:bg-accent dark:data-[state=indeterminate]:text-accent-foreground",
      className,
    )}
    {...props}
  >
    {/* Both icons are rendered and the Indicator's own data-state picks one, so a controlled
        `checked="indeterminate"` and an uncontrolled `defaultChecked="indeterminate"` both show the dash. */}
    <CheckboxPrimitive.Indicator className="group flex items-center justify-center text-current">
      <CheckIcon className="h-3.5 w-3.5 group-data-[state=indeterminate]:hidden" />
      <MinusIcon className="hidden h-3.5 w-3.5 group-data-[state=indeterminate]:block" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
