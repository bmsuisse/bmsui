import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import { forwardRef, useEffect, useRef, useState } from "react";
import { addPrecise, clampNumber, formatLocaleNumber, parseLocaleNumber, roundTo } from "../../lib/numberField";
import { cn } from "../../lib/utils";
import { Input, type InputProps } from "../../primitives/input";

export interface NumberInputLabels {
  increment: string;
  decrement: string;
}

export const defaultNumberInputLabels: NumberInputLabels = {
  increment: "Increase",
  decrement: "Decrease",
};

export interface NumberInputProps
  extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "step" | "size"> {
  /** The number, or `null` for an empty field. */
  value: number | null;
  /** Called with the parsed (and clamped) number once typed text is committed, or on every step. `null` when cleared. */
  onValueChange: (value: number | null) => void;
  /** Called when the typed text becomes (in)valid, so a form can block submit while the field holds a non-number. */
  onInvalidChange?: (invalid: boolean) => void;
  min?: number;
  max?: number;
  /** Amount for ArrowUp/ArrowDown and the stepper buttons (Shift = ×10). @default 1 */
  step?: number;
  /** Fixed number of decimals shown (`2` -> `1’234.50`). Omit to show the value as is. */
  decimals?: number;
  /** Extra `Intl.NumberFormat` options for the display (e.g. `{ useGrouping: false }`). */
  formatOptions?: Intl.NumberFormatOptions;
  /** Display and parse locale. @default "de-CH" */
  locale?: string;
  /** Show the up/down stepper buttons inside the field. */
  stepper?: boolean;
  /** `sm` matches `Button size="sm"` (h-8). @default "default" */
  size?: "sm" | "default";
  /** Class for the wrapping element (`className` styles it too; this one targets the `<input>`). */
  inputClassName?: string;
  labels?: Partial<NumberInputLabels>;
}

/**
 * Number field in the app locale (de-CH shows `1’234.50`) instead of
 * `<input type="number">`, which ignores the locale and silently drops `1234,5`.
 * Reads `1234,5`, `1'234.50`, `1 234` alike. Text commits on blur or Enter like
 * `DateInput`; out-of-range numbers are clamped to `min`/`max`; text that is no
 * number marks the field `aria-invalid` and keeps the previous value.
 * ArrowUp/ArrowDown (and the optional `stepper` buttons) step by `step`.
 * `ref`, `data-testid` and other input props go to the `<input>`; with `name`, a
 * hidden input submits the plain number. The focus ring fades in (150 ms);
 * stepper buttons darken and nudge their chevron 1px while pressed.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onValueChange,
      onInvalidChange,
      min,
      max,
      step = 1,
      decimals,
      formatOptions,
      locale = "de-CH",
      stepper = false,
      size = "default",
      labels,
      className,
      inputClassName,
      name,
      disabled,
      readOnly,
      onBlur,
      onFocus,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultNumberInputLabels, ...labels };
    const testId = (props as { "data-testid"?: string })["data-testid"];
    const format = (n: number | null) => formatLocaleNumber(n, locale, { decimals, formatOptions });
    const [text, setText] = useState(() => format(value));
    const [invalid, setInvalidState] = useState(false);
    // Bumped on every commit so the text re-syncs even when the parent keeps (or clamps back to) the same value.
    const [commits, setCommits] = useState(0);
    const dirty = useRef(false);
    const focused = useRef(false);
    const invalidRef = useRef(false);
    const setInvalid = (next: boolean) => {
      if (invalidRef.current === next) return;
      invalidRef.current = next;
      setInvalidState(next);
      onInvalidChange?.(next);
    };

    useEffect(() => {
      if (focused.current && dirty.current) return;
      setText(format(value));
      setInvalid(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when the value or its display changes
    }, [value, commits, locale, decimals, JSON.stringify(formatOptions)]);

    const emit = (next: number | null) => {
      dirty.current = false;
      setInvalid(false);
      setText(format(next));
      setCommits((n) => n + 1);
      if (next !== value) onValueChange(next);
    };

    const commit = () => {
      if (!dirty.current) return;
      if (!text.trim()) return emit(null);
      const parsed = parseLocaleNumber(text, locale, formatOptions);
      if (parsed == null) {
        dirty.current = false;
        setInvalid(true);
        return;
      }
      const rounded = decimals != null ? roundTo(parsed, decimals) : parsed;
      emit(clampNumber(rounded, min, max));
    };

    const stepBy = (direction: 1 | -1, multiplier = 1) => {
      if (disabled || readOnly) return;
      const typed = dirty.current ? parseLocaleNumber(text, locale, formatOptions) : value;
      const base = typed ?? value;
      const next =
        base == null ? (direction > 0 ? (min ?? 0) : (max ?? 0)) : addPrecise(base, direction * step * multiplier);
      emit(clampNumber(next, min, max));
    };

    const atMax = max != null && value != null && value >= max;
    const atMin = min != null && value != null && value <= min;
    const sm = size === "sm";

    return (
      <div className={cn("relative w-full", className)}>
        <Input
          ref={ref}
          {...props}
          className={cn(
            "tabular-nums transition-[color,background-color,border-color,box-shadow] duration-150 ease-out aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive",
            sm && "h-8 px-2.5 text-xs",
            stepper && (sm ? "pr-7" : "pr-8"),
            inputClassName,
          )}
          type="text"
          // Phone decimal pads have no minus key: only use one when negatives are impossible.
          inputMode={min != null && min >= 0 ? "decimal" : "text"}
          autoComplete="off"
          role="spinbutton"
          aria-valuenow={value ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={text || undefined}
          disabled={disabled}
          readOnly={readOnly}
          value={text}
          aria-invalid={invalid || props["aria-invalid"] || undefined}
          onChange={(e) => {
            dirty.current = true;
            setText(e.target.value);
            setInvalid(false);
          }}
          onFocus={(e) => {
            focused.current = true;
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focused.current = false;
            commit();
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              stepBy(e.key === "ArrowUp" ? 1 : -1, e.shiftKey ? 10 : 1);
            } else if (e.key === "Home" && min != null && e.ctrlKey && !readOnly && !disabled) {
              e.preventDefault();
              emit(min);
            } else if (e.key === "End" && max != null && e.ctrlKey && !readOnly && !disabled) {
              e.preventDefault();
              emit(max);
            }
            onKeyDown?.(e);
          }}
        />
        {stepper ? (
          <div
            className={cn(
              "absolute inset-y-px right-px flex flex-col overflow-hidden rounded-r-[calc(var(--radius-md,0.375rem)-1px)] border-l border-input",
              sm ? "w-6" : "w-7",
              // The whole field fades once (like the input); the buttons don't fade again on top.
              disabled && "opacity-50",
            )}
          >
            {(
              [
                [1, l.increment, ChevronUpIcon, atMax],
                [-1, l.decrement, ChevronDownIcon, atMin],
              ] as const
            ).map(([direction, label, Icon, atBound]) => (
              <button
                key={direction}
                type="button"
                tabIndex={-1}
                aria-label={label}
                disabled={disabled || readOnly || atBound}
                data-testid={testId ? `${testId}-${direction > 0 ? "increment" : "decrement"}` : undefined}
                // Keep focus in the input so a later blur still commits typed text.
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => stepBy(direction, e.shiftKey ? 10 : 1)}
                className={cn(
                  "flex flex-1 items-center justify-center text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted-foreground/10 hover:text-foreground active:bg-muted-foreground/20 disabled:pointer-events-none",
                  // Press feedback: the chevron nudges 1px in the step direction.
                  "[&>svg]:transition-transform [&>svg]:duration-100 [&>svg]:ease-out motion-reduce:[&>svg]:transition-none",
                  direction > 0 ? "active:[&>svg]:-translate-y-px" : "active:[&>svg]:translate-y-px",
                  !disabled && "disabled:opacity-40",
                  direction < 0 && "border-t border-input",
                )}
              >
                <Icon aria-hidden="true" className={sm ? "h-3 w-3" : "h-3.5 w-3.5"} />
              </button>
            ))}
          </div>
        ) : null}
        {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";
