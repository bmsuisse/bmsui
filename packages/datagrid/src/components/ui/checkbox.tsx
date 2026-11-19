import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "@heroicons/react/24/outline";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

type CheckboxProps = Omit<CheckboxPrimitive.Root.Props, "checked" | "defaultChecked" | "indeterminate" | "className"> & {
  className?: string;
  /** Controlled; `"indeterminate"` renders the dash and `aria-checked="mixed"`. */
  checked?: boolean | "indeterminate";
};

/** Tri-state checkbox; keeps Radix's `data-state` (checked / unchecked / indeterminate) for styles and apps' tests. */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(({ className, checked = false, ...props }, ref) => {
  const indeterminate = checked === "indeterminate";
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      // A native button, like Radix's: a wrapping <label> then names it alone, not also Base UI's hidden input.
      nativeButton
      render={<button type="button" />}
      checked={checked === true}
      indeterminate={indeterminate}
      data-state={indeterminate ? "indeterminate" : checked ? "checked" : "unchecked"}
      className={cn(
        // A fixed 3px radius, not the theme's scaled `rounded-sm` — that
        // token is meant for buttons/cards sized well above 16px, and on a
        // box this small it reads as a circle (radio button) instead of a
        // checkbox once an app's `--radius` grows past shadcn's default.
        "peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[min(3px,var(--radius,0.625rem))] border border-primary dark:border-ring shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:data-[state=checked]:bg-accent dark:data-[state=checked]:text-accent-foreground dark:data-[state=indeterminate]:bg-accent dark:data-[state=indeterminate]:text-accent-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {indeterminate ? <MinusIcon className="h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = "Checkbox";
