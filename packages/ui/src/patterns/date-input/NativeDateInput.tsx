import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { Input } from "../../primitives/input";
import {
  DateInputMessage,
  type DateInputError,
  type DateInputProps,
  defaultDateInputLabels,
  errorMessage,
  invalidClass,
  toDay,
} from "./shared";

/**
 * The browser's own `<input type="date">`, used on touch devices where its wheel or
 * calendar beats typing. Same contract as the typed field: only real dates within
 * `min`/`max` reach `onValueChange`; a half-typed or out-of-range entry marks the field
 * invalid and is reported through `onInvalidChange`. The browser's own validity (bad
 * input, min/max) already blocks form submit.
 */
export const NativeDateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onValueChange,
      onInvalidChange,
      locale: _locale,
      native: _native,
      min,
      max,
      showError = true,
      labels,
      onBlur,
      placeholder: _placeholder,
      className,
      name,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultDateInputLabels, ...labels };
    const minDay = toDay(min);
    const maxDay = toDay(max);
    // The entry as the control holds it, even when rejected, so a half-typed or out-of-range date isn't wiped.
    const [raw, setRaw] = useState(toDay(value));
    const [error, setErrorState] = useState<DateInputError | null>(null);
    const errorRef = useRef<DateInputError | null>(null);
    const messageId = useId();

    const setError = (next: DateInputError | null) => {
      if (errorRef.current === next) return;
      errorRef.current = next;
      setErrorState(next);
      onInvalidChange?.(next != null, next ?? undefined);
    };

    useEffect(() => {
      setRaw(toDay(value));
      setError(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when the outside value changes
    }, [value]);

    const message = errorMessage(error, l);
    const showMessage = showError && message !== "";
    const describedBy = [props["aria-describedby"], showMessage ? messageId : undefined].filter(Boolean).join(" ") || undefined;

    return (
      <div className={className}>
        <Input
          ref={ref}
          {...props}
          className={invalidClass}
          type="date"
          min={minDay || undefined}
          max={maxDay || undefined}
          value={raw}
          aria-invalid={error != null || props["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            const el = e.currentTarget;
            const next = el.value;
            setRaw(next);
            // Half-typed (`badInput`): not an error yet, the user is still filling it in.
            if (el.validity.badInput) {
              setError(null);
              return;
            }
            if (next && ((minDay && next < minDay) || (maxDay && next > maxDay))) {
              setError("range");
              return;
            }
            setError(null);
            if (next !== toDay(value)) onValueChange(next);
          }}
          onBlur={(e) => {
            if (e.currentTarget.validity.badInput) setError("invalid");
            onBlur?.(e);
          }}
        />
        {showMessage ? <DateInputMessage id={messageId} message={message} /> : null}
        {name ? <input type="hidden" name={name} value={toDay(value)} /> : null}
      </div>
    );
  },
);
NativeDateInput.displayName = "NativeDateInput";
