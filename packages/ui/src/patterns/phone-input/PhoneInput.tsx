import { forwardRef, useState } from "react";
import { normalizePhone } from "../../lib/swissPhone";
import type { InputProps } from "../../primitives/input";
import { Input } from "../../primitives/input";

export interface PhoneInputProps extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "type"> {
  /** The number as shown. Omit (with `defaultValue`) to let the field keep its own text. */
  value?: string;
  defaultValue?: string;
  /** Called with the typed text on every keystroke, and with the normalised number when the field is left. */
  onValueChange?: (value: string) => void;
  /** Reformats the text when the field is left or Enter is pressed. Default `normalizePhone` (Swiss numbers to `+41 79 123 45 67`, others as typed). Pass `(v) => v` to switch it off. */
  normalize?: (value: string) => string;
}

/**
 * Phone field for `tel` input that reformats a Swiss number (`079…`, `0041…`, `+41…`) into
 * the canonical `+41 79 123 45 67` when the user leaves it — never while typing, so it can't
 * fight the caret. Numbers with another country code stay exactly as typed. Mobile keyboards
 * get the dial pad (`inputMode="tel"`) and browsers autofill (`autoComplete="tel"`).
 * A single `Input`, so it works as the child of `FormField` (id, `aria-invalid` and
 * `aria-describedby` are forwarded).
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, defaultValue, onValueChange, normalize = normalizePhone, placeholder, onBlur, onKeyDown, ...props }, ref) => {
    const [inner, setInner] = useState(defaultValue ?? "");
    const controlled = value !== undefined;
    const shown = controlled ? value : inner;

    const set = (next: string) => {
      if (!controlled) setInner(next);
      onValueChange?.(next);
    };
    const tidy = (text: string) => {
      const next = normalize(text);
      if (next !== text) set(next);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={placeholder ?? "079 000 00 00"}
        {...props}
        value={shown}
        onChange={(e) => set(e.target.value)}
        onBlur={(e) => {
          tidy(e.target.value);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.key === "Enter" && !e.defaultPrevented) tidy(e.currentTarget.value);
        }}
      />
    );
  },
);
PhoneInput.displayName = "PhoneInput";
