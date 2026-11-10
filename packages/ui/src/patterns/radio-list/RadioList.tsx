import type { ReactElement, ReactNode } from "react";
import { useId } from "react";
import { cn } from "../../lib/utils";
import { RadioGroup, RadioGroupItem } from "../../primitives/radio-group";

/** One choice of a {@link RadioList}. */
export interface RadioListOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /** Secondary line under the label. */
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioListProps<T extends string = string> {
  options: RadioListOption<T>[];
  /** Selected value, `""` for none. */
  value: T | "";
  onValueChange: (value: T) => void;
  /** `card` puts each option in a bordered, clickable box that highlights when selected. @default "default" */
  variant?: "default" | "card";
  /** `horizontal` lays options out in a row (cards share the width). @default "vertical" */
  orientation?: "vertical" | "horizontal";
  /** Form field name (Radix renders a native input for form submits). */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * A labelled list of mutually exclusive choices, each with an optional
 * description ("Delivery: Standard – 3–5 days / Express – next day"). Arrow keys
 * move the selection. `variant="card"` for prominent choices (plans, shipping
 * methods). Use `SegmentedControl` for short view switches without
 * descriptions, `Select`/`Combobox` for more than ~6 options. For your own
 * layout use the `RadioGroup` + `RadioGroupItem` primitives.
 */
export function RadioList<T extends string = string>({
  options,
  value,
  onValueChange,
  variant = "default",
  orientation = "vertical",
  name,
  disabled,
  required,
  className,
  ...props
}: RadioListProps<T>): ReactElement {
  const baseId = useId();
  const card = variant === "card";
  const testId = props["data-testid"];
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      orientation={orientation}
      name={name}
      disabled={disabled}
      required={required}
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      data-testid={testId ?? "radio-list"}
      className={cn(
        orientation === "horizontal" ? "flex flex-wrap content-start" : "grid content-start",
        card ? "gap-2" : orientation === "horizontal" ? "gap-x-6 gap-y-2" : "gap-3",
        className,
      )}
    >
      {options.map((option, index) => {
        // Index, not value: values may contain spaces or other characters invalid in ids.
        const id = `${baseId}-${index}`;
        const labelId = `${id}-label`;
        const descriptionId = option.description ? `${id}-description` : undefined;
        const optionDisabled = disabled || option.disabled;
        return (
          <label
            key={option.value}
            htmlFor={id}
            data-testid={testId ? `${testId}-option-${option.value}` : undefined}
            className={cn(
              "group flex items-start gap-3 text-sm",
              optionDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              card &&
                "rounded-md border border-input bg-background p-3 shadow-sm transition-colors has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-accent/5",
              card && !optionDisabled && "hover:border-muted-foreground/40",
              card && orientation === "horizontal" && "min-w-40 flex-1",
            )}
          >
            <RadioGroupItem
              id={id}
              value={option.value}
              disabled={option.disabled}
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              // The label already fades disabled options; don't fade the circle twice.
              className={cn("mt-0.5 disabled:opacity-100", card && "focus-visible:ring-0 focus-visible:ring-offset-0")}
            />
            <span className="grid gap-0.5">
              <span id={labelId} className="font-medium leading-5 text-foreground">
                {option.label}
              </span>
              {option.description ? (
                <span id={descriptionId} className="text-xs leading-4 text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
