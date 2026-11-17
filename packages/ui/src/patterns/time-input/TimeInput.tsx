import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { formatTime, parseTime, shiftTime, timePlaceholder, timeToMinutes, toTime } from "../../lib/timeField";
import { cn } from "../../lib/utils";
import type { InputProps } from "../../primitives/input";
import { Input } from "../../primitives/input";
import { DateInputMessage, invalidClass, useCoarsePointer } from "../date-input/shared";

/** Why the entry was rejected: it is no time (`invalid`) or lies outside `min`/`max` (`range`). */
export type TimeInputError = "invalid" | "range";

export interface TimeInputLabels {
  /** Message for text that is no time. */
  invalid: string;
  /** Message for a time before `min` or after `max`. */
  outOfRange: string;
}

export const defaultTimeInputLabels: TimeInputLabels = {
  invalid: "Enter a valid time",
  outOfRange: "Time is out of range",
};

export interface TimeInputProps
  extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "step"> {
  /** `HH:mm` (24 h; the time part of an ISO datetime is accepted too), or `""` for none. */
  value: string;
  /** Called with `HH:mm` (or `""` when cleared). Only real times within `min`/`max` get here. */
  onValueChange: (time: string) => void;
  /** Called when the field becomes (in)valid, so a form can block submit while it holds a non-time. */
  onInvalidChange?: (invalid: boolean, reason?: TimeInputError) => void;
  /** Display and parse clock. Default `de-CH` (24 h `14:30`); `en-US` shows `2:30 PM`. Ignored by the native control, which follows the device. */
  locale?: string;
  /** Earliest allowed `HH:mm`. */
  min?: string;
  /** Latest allowed `HH:mm`. */
  max?: string;
  /** Minutes ArrowUp/ArrowDown move the time by (PageUp/PageDown move by an hour). Default `1`. */
  step?: number;
  /** Shows the error text under the field when the entry is rejected. Turn off to render it yourself (e.g. via `onInvalidChange`). Default `true`. */
  showError?: boolean;
  /** Translations for the error messages. */
  labels?: Partial<TimeInputLabels>;
  /** `auto` (default) uses the browser's `<input type="time">` on touch devices (`pointer: coarse`), the typed field elsewhere. `always` / `never` force one. */
  native?: "auto" | "always" | "never";
  /** Renders just the typed `<input>` (no wrapper, no message; `className` goes on the input) for embedding in an `InputGroup` (`DateTimeInput`). Implies `native="never"`. */
  bare?: boolean;
}

const errorMessage = (error: TimeInputError | null, l: TimeInputLabels): string =>
  error === "invalid" ? l.invalid : error === "range" ? l.outOfRange : "";

/** `invalid` for non-times, `range` outside `min`/`max`, null when the text is fine (or empty). */
function check(text: string, min: string, max: string): TimeInputError | null {
  if (!text.trim()) return null;
  const time = parseTime(text);
  if (time == null) return "invalid";
  return inRange(time, min, max) ? null : "range";
}

const inRange = (time: string, min: string, max: string): boolean => {
  const at = timeToMinutes(time) as number;
  const lo = timeToMinutes(min);
  const hi = timeToMinutes(max);
  return !((lo != null && at < lo) || (hi != null && at > hi));
};

/**
 * Time-of-day field that shows and reads the app's clock (24 h `14:30` in de-CH)
 * instead of the browser's own `type="time"`. The value is `HH:mm`. Text is committed
 * on blur or Enter and accepts `9`, `930`, `9:30`, `09.30` and (with `locale="en-US"`
 * or any am/pm suffix) `9:30 pm`. ArrowUp/ArrowDown step by `step` minutes inside
 * `min`/`max`. Touch devices get the browser's own time control (`native`).
 *
 * Only real times within `min`/`max` reach `onValueChange`. Rejected text keeps the
 * previous value, marks the field `aria-invalid` with an error message, and sets the
 * field's native validity so a surrounding `<form>` refuses to submit. With `name`, a
 * hidden input submits `HH:mm`.
 */
export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>((props, ref) => {
  const coarse = useCoarsePointer();
  const useNative = !props.bare && (props.native === "always" || (props.native !== "never" && coarse));
  return useNative ? <NativeTimeInput ref={ref} {...props} /> : <TypedTimeInput ref={ref} {...props} />;
});
TimeInput.displayName = "TimeInput";

const TypedTimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  (
    {
      value,
      onValueChange,
      onInvalidChange,
      locale = "de-CH",
      min,
      max,
      step = 1,
      showError = true,
      labels,
      onBlur,
      onKeyDown,
      onFocus,
      placeholder,
      className,
      name,
      disabled,
      readOnly,
      native: _native,
      bare = false,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultTimeInputLabels, ...labels };
    const minTime = toTime(min);
    const maxTime = toTime(max);
    const [text, setText] = useState(() => formatTime(toTime(value), locale));
    const [error, setErrorState] = useState<TimeInputError | null>(null);
    // Typed since the last commit: a commit only acts then, and outside value changes don't clobber the typing.
    const dirty = useRef(false);
    const focused = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messageId = useId();
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const errorRef = useRef<TimeInputError | null>(null);
    const setError = (next: TimeInputError | null) => {
      if (errorRef.current === next) return;
      errorRef.current = next;
      setErrorState(next);
      onInvalidChange?.(next != null, next ?? undefined);
    };

    useEffect(() => {
      if (focused.current && dirty.current) return;
      setText(formatTime(toTime(value), locale));
      setError(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when value/locale change
    }, [value, locale]);

    // Native validity follows the text as it is typed, so a form can't submit text that is no time.
    const liveMessage = errorMessage(check(text, minTime, maxTime), l);
    useEffect(() => {
      inputRef.current?.setCustomValidity(liveMessage);
    }, [liveMessage]);

    const commitTime = (time: string) => {
      setText(formatTime(time, locale));
      setError(null);
      if (time !== toTime(value)) onValueChange(time);
    };

    const commit = () => {
      if (!dirty.current) return;
      dirty.current = false;
      if (!text.trim()) {
        setError(null);
        if (value) onValueChange("");
        return;
      }
      const problem = check(text, minTime, maxTime);
      setError(problem);
      if (problem) return;
      commitTime(parseTime(text) as string);
    };

    /** Arrow keys step by `step` minutes, PageUp/PageDown by an hour (like the segments of a native time field). */
    const stepBy = (key: string): string | null => {
      const minutes = Math.max(1, step);
      const by = key === "ArrowUp" ? minutes : key === "ArrowDown" ? -minutes : key === "PageUp" ? 60 : key === "PageDown" ? -60 : 0;
      if (!by) return null;
      const current = parseTime(text) ?? toTime(value);
      // An empty field starts at the earliest allowed time instead of jumping a step away from it.
      if (!current) return minTime || "00:00";
      return shiftTime(current, by, minTime, maxTime);
    };

    const message = errorMessage(error, l);
    const showMessage = !bare && showError && message !== "";
    const describedBy = [props["aria-describedby"], showMessage ? messageId : undefined].filter(Boolean).join(" ") || undefined;

    const input = (
      <Input
        ref={inputRef}
        {...props}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(invalidClass, bare && className)}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder={placeholder ?? timePlaceholder(locale)}
        aria-invalid={error != null || props["aria-invalid"] || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          dirty.current = true;
          setText(e.target.value);
          // Don't scold mid-typing: the error clears now and shows again on the next commit.
          setError(null);
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
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (e.key === "Enter") commit();
          else if (!readOnly && !disabled && !e.altKey && !e.ctrlKey && !e.metaKey) {
            const next = stepBy(e.key);
            if (next) {
              e.preventDefault();
              dirty.current = false;
              commitTime(next);
            }
          }
        }}
      />
    );
    const hidden = name ? <input type="hidden" name={name} value={toTime(value)} /> : null;

    if (bare) {
      return (
        <>
          {input}
          {hidden}
        </>
      );
    }
    return (
      <div className={className}>
        {input}
        {showMessage ? <DateInputMessage id={messageId} message={message} /> : null}
        {hidden}
      </div>
    );
  },
);
TypedTimeInput.displayName = "TypedTimeInput";

/**
 * The browser's own `<input type="time">`, used on touch devices where its wheel beats typing.
 * Same contract as the typed field: only real times within `min`/`max` reach `onValueChange`.
 */
const NativeTimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  (
    {
      value,
      onValueChange,
      onInvalidChange,
      locale: _locale,
      native: _native,
      bare: _bare,
      min,
      max,
      step = 1,
      showError = true,
      labels,
      placeholder: _placeholder,
      className,
      name,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultTimeInputLabels, ...labels };
    const minTime = toTime(min);
    const maxTime = toTime(max);
    const [raw, setRaw] = useState(toTime(value));
    const [error, setErrorState] = useState<TimeInputError | null>(null);
    const errorRef = useRef<TimeInputError | null>(null);
    const messageId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const setError = (next: TimeInputError | null) => {
      if (errorRef.current === next) return;
      errorRef.current = next;
      setErrorState(next);
      onInvalidChange?.(next != null, next ?? undefined);
    };

    useEffect(() => {
      setRaw(toTime(value));
      setError(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when the outside value changes
    }, [value]);

    const message = errorMessage(error, l);
    const showMessage = showError && message !== "";
    const describedBy = [props["aria-describedby"], showMessage ? messageId : undefined].filter(Boolean).join(" ") || undefined;

    return (
      <div className={className}>
        <Input
          ref={inputRef}
          {...props}
          className={invalidClass}
          type="time"
          min={minTime || undefined}
          max={maxTime || undefined}
          step={Math.max(1, step) * 60}
          value={raw}
          aria-invalid={error != null || props["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            const el = e.currentTarget;
            const next = el.value;
            setRaw(next);
            // Half-filled (`badInput`): not an error yet, the user is still picking.
            if (el.validity.badInput) {
              setError(null);
              return;
            }
            if (next && !inRange(next, minTime, maxTime)) {
              setError("range");
              return;
            }
            setError(null);
            if (next !== toTime(value)) onValueChange(next);
          }}
          onBlur={(e) => {
            if (e.currentTarget.validity.badInput) setError("invalid");
            props.onBlur?.(e);
          }}
        />
        {showMessage ? <DateInputMessage id={messageId} message={message} /> : null}
        {name ? <input type="hidden" name={name} value={toTime(value)} /> : null}
      </div>
    );
  },
);
NativeTimeInput.displayName = "NativeTimeInput";
