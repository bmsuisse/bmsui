import { Radio } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { withCheckedState } from "../lib/checkedRender";
import { cn } from "../lib/utils";

export interface RadioGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
}

/** Radio group root (arrow keys, one tab stop). Lay items out yourself, or use `RadioList`. */
export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, onValueChange, orientation, ...props }, ref) => (
    <RadioGroupPrimitive<string>
      ref={ref}
      aria-orientation={orientation}
      data-orientation={orientation}
      onValueChange={onValueChange && ((value) => onValueChange(value))}
      className={cn("grid gap-2", className)}
      {...(props as ComponentPropsWithoutRef<typeof RadioGroupPrimitive<string>>)}
    />
  ),
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends Omit<ComponentPropsWithoutRef<"button">, "value"> {
  value: string;
  required?: boolean;
}

const itemRender = withCheckedState("button");
const indicatorRender = withCheckedState("span");

/** One radio circle. Pair it with a `Label htmlFor`. Same size and checked fill as `Checkbox`. The fill cross-fades and the dot scales in (150 ms ease-out; no scale with reduced motion). */
export const RadioGroupItem = forwardRef<HTMLButtonElement, RadioGroupItemProps>(({ className, ...props }, ref) => (
  <Radio.Root
    ref={ref}
    render={itemRender}
    nativeButton
    className={cn(
      "peer inline-flex aspect-square h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/70 bg-background shadow-sm transition-[color,background-color,border-color,box-shadow] duration-150 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      "enabled:hover:border-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary dark:data-[state=checked]:border-accent dark:data-[state=checked]:bg-accent",
      className,
    )}
    {...(props as ComponentPropsWithoutRef<typeof Radio.Root<string>>)}
  >
    <Radio.Indicator render={indicatorRender} className="flex items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground transition-transform duration-150 ease-out starting:scale-0 motion-reduce:transition-none" />
    </Radio.Indicator>
  </Radio.Root>
));
RadioGroupItem.displayName = "RadioGroupItem";
