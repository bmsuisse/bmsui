import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "@heroicons/react/24/outline";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { withCheckedState } from "../lib/checkedRender";
import { useControllable } from "../lib/radixCompat";
import { cn } from "../lib/utils";

type CheckedState = boolean | "indeterminate";

export interface CheckboxProps
  extends Omit<ComponentPropsWithoutRef<"button">, "checked" | "defaultChecked" | "value" | "onChange"> {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  required?: boolean;
  name?: string;
  /** Submitted with a form when checked. @default "on" */
  value?: string;
}

const rootRender = withCheckedState("button");
const indicatorRender = withCheckedState("span");

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked: checkedProp, defaultChecked = false, onCheckedChange, ...props }, ref) => {
    const [checked, setChecked] = useControllable(checkedProp, defaultChecked, onCheckedChange);
    return (
      <CheckboxPrimitive.Root
        ref={ref}
        render={rootRender}
        nativeButton
        checked={checked === true}
        indeterminate={checked === "indeterminate"}
        onCheckedChange={(next) => setChecked(next)}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-[min(3px,var(--radius,0.625rem))] border border-muted-foreground/70 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary dark:data-[state=checked]:border-ring dark:data-[state=indeterminate]:border-ring dark:data-[state=checked]:bg-accent dark:data-[state=checked]:text-accent-foreground dark:data-[state=indeterminate]:bg-accent dark:data-[state=indeterminate]:text-accent-foreground",
          className,
        )}
        {...(props as ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>)}
      >
        {/* Both icons are rendered and the Indicator's own data-state picks one. */}
        <CheckboxPrimitive.Indicator
          render={indicatorRender}
          className="group flex items-center justify-center text-current"
        >
          <CheckIcon className="h-3.5 w-3.5 group-data-[state=indeterminate]:hidden" />
          <MinusIcon className="hidden h-3.5 w-3.5 group-data-[state=indeterminate]:block" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);
Checkbox.displayName = "Checkbox";
