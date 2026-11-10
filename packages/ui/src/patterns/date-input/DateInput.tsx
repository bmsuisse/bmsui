import { forwardRef, useEffect, useRef, useState } from "react";
import { datePlaceholder, formatIsoDay, parseIsoDay } from "../../lib/dateField";
import { cn } from "../../lib/utils";
import { Input, type InputProps } from "../../primitives/input";

export interface DateInputProps extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "type"> {
  /** ISO day `yyyy-mm-dd` (the date part of an ISO datetime is accepted too), or `""` for none. */
  value: string;
  /** Called with an ISO day (or `""` when cleared) once the typed text is committed. */
  onValueChange: (iso: string) => void;
  /** Called when the typed text becomes (in)valid, so a form can block submit while the field holds a non-date. */
  onInvalidChange?: (invalid: boolean) => void;
  /** Display and parse order. Default `de-CH` (dd.mm.yyyy). */
  locale?: string;
}

/**
 * Day field that shows and reads the app's locale (dd.mm.yyyy in de-CH) instead of
 * the browser's own `type="date"` format. The value is an ISO day. Text is committed
 * on blur or Enter; text that is no date marks the field `aria-invalid` and keeps
 * the previous value. With `name`, a hidden input submits the ISO day in forms.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    { value, onValueChange, onInvalidChange, locale = "de-CH", onBlur, onKeyDown, onFocus, placeholder, className, name, ...props },
    ref,
  ) => {
    const [text, setText] = useState(() => formatIsoDay(value, locale));
    const [invalid, setInvalidState] = useState(false);
    // Typed since the last commit: a commit only acts then, and outside value changes don't clobber the typing.
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
      setText(formatIsoDay(value, locale));
      setInvalid(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when value/locale change
    }, [value, locale]);

    const commit = () => {
      if (!dirty.current) return;
      dirty.current = false;
      if (!text.trim()) {
        setInvalid(false);
        if (value) onValueChange("");
        return;
      }
      const iso = parseIsoDay(text, locale);
      setInvalid(iso == null);
      if (iso == null) return;
      setText(formatIsoDay(iso, locale));
      if (iso !== value.slice(0, 10)) onValueChange(iso);
    };

    return (
      <>
        <Input
          ref={ref}
          {...props}
          className={cn("aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive", className)}
          type="text"
          autoComplete="off"
          value={text}
          placeholder={placeholder ?? datePlaceholder(locale)}
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
            onKeyDown?.(e);
          }}
        />
        {name ? <input type="hidden" name={name} value={value.slice(0, 10)} /> : null}
      </>
    );
  },
);
DateInput.displayName = "DateInput";
