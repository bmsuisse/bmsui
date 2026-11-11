import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { datePlaceholder, formatIsoDay, parseIsoDay, shiftIsoDay, toLocalIsoDay } from "../../lib/dateField";
import { cn } from "../../lib/utils";
import { Input } from "../../primitives/input";
import { NativeDateInput } from "./NativeDateInput";
import {
  DateInputMessage,
  type DateInputError,
  type DateInputProps,
  defaultDateInputLabels,
  errorMessage,
  invalidClass,
  toDay,
  useCoarsePointer,
} from "./shared";

export type { DateInputError, DateInputLabels, DateInputProps } from "./shared";
export { defaultDateInputLabels } from "./shared";

/** `invalid` for non-dates, `range` outside `min`/`max`, `disabled` for blocked days, null when the text is fine (or empty). ISO days sort as strings. */
function check(
  text: string,
  locale: string,
  min: string,
  max: string,
  isDateDisabled?: (iso: string) => boolean,
): DateInputError | null {
  if (!text.trim()) return null;
  const iso = parseIsoDay(text, locale);
  if (iso == null) return "invalid";
  if ((min && iso < min) || (max && iso > max)) return "range";
  if (isDateDisabled?.(iso)) return "disabled";
  return null;
}

/**
 * Day field that shows and reads the app's locale (dd.mm.yyyy in de-CH) instead of
 * the browser's own `type="date"` format. The value is an ISO day. Text is committed
 * on blur or Enter. The calendar button opens the browser's own date picker
 * (`showPicker()`), restricted to `min`/`max`; the picker itself uses the browser's
 * language, not `locale`.
 *
 * Only real dates within `min`/`max` reach `onValueChange`. Rejected text keeps the
 * previous value, marks the field `aria-invalid` with an error message, and sets
 * the field's native validity, so a surrounding `<form>` refuses to submit while it
 * holds text that is no date. With `name`, a hidden input submits the ISO day.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>((props, ref) => {
  const coarse = useCoarsePointer();
  const useNative = !props.bare && (props.native === "always" || (props.native !== "never" && coarse));
  return useNative ? <NativeDateInput ref={ref} {...props} /> : <TypedDateInput ref={ref} {...props} />;
});
DateInput.displayName = "DateInput";

const TypedDateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onValueChange,
      onInvalidChange,
      locale = "de-CH",
      min,
      max,
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
      isDateDisabled,
      native: _native,
      bare = false,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultDateInputLabels, ...labels };
    const minDay = toDay(min);
    const maxDay = toDay(max);
    const [text, setText] = useState(() => formatIsoDay(value, locale));
    const [error, setErrorState] = useState<DateInputError | null>(null);
    // Typed since the last commit: a commit only acts then, and outside value changes don't clobber the typing.
    const dirty = useRef(false);
    const focused = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLInputElement>(null);
    const messageId = useId();
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const errorRef = useRef<DateInputError | null>(null);
    const setError = (next: DateInputError | null) => {
      if (errorRef.current === next) return;
      errorRef.current = next;
      setErrorState(next);
      onInvalidChange?.(next != null, next ?? undefined);
    };

    useEffect(() => {
      if (focused.current && dirty.current) return;
      setText(formatIsoDay(value, locale));
      setError(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when value/locale change
    }, [value, locale]);

    // Native validity follows the text as it is typed, not only once committed: a form must not submit
    // (Enter, submit button) with text that is no date while `value` still holds the previous day.
    const live = check(text, locale, minDay, maxDay, isDateDisabled);
    const liveMessage = errorMessage(live, l);
    useEffect(() => {
      inputRef.current?.setCustomValidity(liveMessage);
    }, [liveMessage]);

    const commitIso = (iso: string) => {
      setText(formatIsoDay(iso, locale));
      setError(null);
      if (iso !== value.slice(0, 10)) onValueChange(iso);
    };

    const commit = () => {
      if (!dirty.current) return;
      dirty.current = false;
      if (!text.trim()) {
        setError(null);
        if (value) onValueChange("");
        return;
      }
      const problem = check(text, locale, minDay, maxDay, isDateDisabled);
      setError(problem);
      if (problem) return;
      commitIso(parseIsoDay(text, locale) as string);
    };

    /** Arrow keys step the day, PageUp/PageDown the month (Shift: year), like the segments of a native date field. */
    const step = (key: string, shift: boolean): string | null => {
      const by =
        key === "ArrowUp" ? { days: 1 } : key === "ArrowDown" ? { days: -1 } : key === "PageUp" ? { months: shift ? 12 : 1 } : key === "PageDown" ? { months: shift ? -12 : -1 } : null;
      if (!by) return null;
      const base = parseIsoDay(text, locale) ?? (toDay(value) || toLocalIsoDay(new Date()));
      // An empty field starts at today (or the nearest allowed day) instead of jumping a step away from it.
      let next = text.trim() || value ? shiftIsoDay(base, by) : base;
      // Day steps hop over blocked days (up to a year of them); a blocked month/year landing is ignored.
      for (let hops = 0; hops < 366 && isDateDisabled?.(next) && "days" in by; hops++) next = shiftIsoDay(next, by);
      if ((minDay && next < minDay) || (maxDay && next > maxDay)) next = minDay && next < minDay ? minDay : maxDay;
      return isDateDisabled?.(next) ? null : next;
    };

    const openPicker = () => {
      const el = pickerRef.current;
      if (!el) return;
      try {
        el.showPicker();
      } catch {
        // No showPicker (older Safari) or blocked: a click opens a native date input there.
        el.click();
      }
    };

    const message = errorMessage(error, l);
    const showMessage = !bare && showError && message !== "";
    const pickable = !bare && !disabled && !readOnly;
    const describedBy = [props["aria-describedby"], showMessage ? messageId : undefined].filter(Boolean).join(" ") || undefined;

    const input = (
      <Input
        ref={inputRef}
        {...props}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(invalidClass, pickable && "pr-9", bare && className)}
        type="text"
        autoComplete="off"
        value={text}
        placeholder={placeholder ?? datePlaceholder(locale)}
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
          else if (!readOnly && !disabled) {
            if (e.key === "ArrowDown" && e.altKey) {
              e.preventDefault();
              openPicker();
            } else if (!e.altKey && !e.ctrlKey && !e.metaKey) {
              const next = step(e.key, e.shiftKey);
              if (next) {
                e.preventDefault();
                dirty.current = false;
                commitIso(next);
              }
            }
          }
        }}
      />
    );
    const hidden = name ? <input type="hidden" name={name} value={toDay(value)} /> : null;

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
        <div className="relative">
          {input}
          {pickable ? (
            <>
              <button
                type="button"
                aria-label={l.openCalendar}
                onClick={openPicker}
                className="absolute inset-y-0 right-0 grid w-9 place-items-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <CalendarDaysIcon aria-hidden="true" className="h-4 w-4" />
              </button>
              {/* Invisible but the size of the field (not display:none), so the browser anchors its picker right under it. */}
              <input
                ref={pickerRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                // No form owner: its min/max must never block, or show a native bubble on, the surrounding form.
                form="bmsui-date-input-picker"
                data-testid="date-input-picker"
                min={minDay || undefined}
                max={maxDay || undefined}
                value={toDay(value)}
                onChange={(e) => {
                  const iso = e.target.value;
                  dirty.current = false;
                  if (iso) {
                    // The browser's picker can't grey out single days: judge the pick like typed text.
                    const problem = check(formatIsoDay(iso, locale), locale, minDay, maxDay, isDateDisabled);
                    if (problem) {
                      setText(formatIsoDay(iso, locale));
                      setError(problem);
                    } else commitIso(iso);
                  } else {
                    setText("");
                    setError(null);
                    if (value) onValueChange("");
                  }
                }}
                className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
              />
            </>
          ) : null}
        </div>
        {showMessage ? <DateInputMessage id={messageId} message={message} /> : null}
        {hidden}
      </div>
    );
  },
);
TypedDateInput.displayName = "TypedDateInput";
