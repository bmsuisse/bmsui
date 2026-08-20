import type { ComponentType, ReactElement } from "react";
import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "../../primitives/button";

/** One segment of a {@link ButtonGroup}. */
export interface ButtonGroupOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface ButtonGroupProps<T extends string = string> {
  options: ButtonGroupOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Forwarded to every segment's `Button`. @default "default" */
  size?: ButtonProps["size"];
  disabled?: boolean;
  /** Accessible name for the group's `role="group"` wrapper. */
  "aria-label"?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * A row of mutually exclusive, connected buttons (single-select segmented
 * control) — e.g. an ignore/create/update choice per row. Built on the
 * `Button` primitive rather than a bespoke element so segments inherit its
 * variant styling, sizes, and disabled/focus-visible behavior for free.
 *
 * Segments share borders (each button after the first overlaps its left
 * border by 1px via `-ml-px`) with `hover:z-10`/`focus-visible:z-10` so the
 * active/hovered segment's own border still draws on top of its neighbor
 * instead of being clipped underneath it.
 */
export function ButtonGroup<T extends string = string>({
  options,
  value,
  onValueChange,
  size = "default",
  disabled,
  className,
  ...props
}: ButtonGroupProps<T>): ReactElement {
  return (
    <div role="group" aria-label={props["aria-label"]} className={cn("inline-flex", className)} data-testid={props["data-testid"]}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            type="button"
            variant={selected ? "default" : "outline"}
            size={size}
            disabled={disabled}
            aria-pressed={selected}
            data-testid={props["data-testid"] ? `${props["data-testid"]}-option-${option.value}` : undefined}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "relative rounded-none focus-visible:z-10",
              !selected && "hover:z-10",
              index === 0 && "rounded-l-md",
              index === options.length - 1 && "rounded-r-md",
              index > 0 && "-ml-px",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
