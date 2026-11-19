import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { withCheckedState } from "../lib/checkedRender";
import { cn } from "../lib/utils";

export interface SwitchProps
  extends Omit<ComponentPropsWithoutRef<"button">, "checked" | "defaultChecked" | "value" | "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  required?: boolean;
  name?: string;
  /** Submitted with a form when on. @default "on" */
  value?: string;
  size?: "sm" | "default";
}

const rootRender = withCheckedState("button");
const thumbRender = withCheckedState("span");

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, size = "default", onCheckedChange, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      render={rootRender}
      nativeButton
      onCheckedChange={onCheckedChange && ((checked) => onCheckedChange(checked))}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-[var(--radius-pill,9999px)] border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary dark:data-[state=checked]:bg-accent data-[state=unchecked]:bg-muted-foreground/70",
        size === "sm" ? "h-3.5 w-6" : "h-5 w-9",
        className,
      )}
      {...(props as ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>)}
    >
      <SwitchPrimitive.Thumb
        render={thumbRender}
        className={cn(
          "pointer-events-none block rounded-[var(--radius-pill,9999px)] bg-background shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0",
          size === "sm"
            ? "h-3 w-3 data-[state=checked]:translate-x-2.5"
            : "h-4 w-4 data-[state=checked]:translate-x-4",
        )}
      />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = "Switch";
