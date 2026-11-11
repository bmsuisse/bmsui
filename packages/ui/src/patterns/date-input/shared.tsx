import type { ReactElement } from "react";
import { useSyncExternalStore } from "react";
import type { InputProps } from "../../primitives/input";
import type { CalendarProps } from "../calendar/Calendar";

/** Why the entry was rejected: it is no date (`invalid`), a real date outside `min`/`max` (`range`), or one `isDateDisabled` blocks (`disabled`). */
export type DateInputError = "invalid" | "range" | "disabled";

export interface DateInputLabels {
  /** Message for text that is no date. */
  invalid: string;
  /** Message for a date before `min` or after `max`. */
  outOfRange: string;
  /** Message for a date that `isDateDisabled` blocks. */
  unavailable: string;
  /** Accessible name of the calendar button. */
  openCalendar: string;
  /** Month navigation in the calendar popover (`picker="calendar"`). */
  previousMonth: string;
  nextMonth: string;
}

export const defaultDateInputLabels: DateInputLabels = {
  invalid: "Enter a valid date",
  outOfRange: "Date is out of range",
  unavailable: "Date is not available",
  openCalendar: "Choose date",
  previousMonth: "Previous month",
  nextMonth: "Next month",
};

export interface DateInputProps
  extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "min" | "max"> {
  /** ISO day `yyyy-mm-dd` (the date part of an ISO datetime is accepted too), or `""` for none. */
  value: string;
  /** Called with an ISO day (or `""` when cleared). Only real dates within `min`/`max` get here. */
  onValueChange: (iso: string) => void;
  /** Called when the field becomes (in)valid, so a form can block submit while it holds a non-date. `reason` is set when `invalid` is true. */
  onInvalidChange?: (invalid: boolean, reason?: DateInputError) => void;
  /** Display and parse order of the typed field. Default `de-CH` (dd.mm.yyyy). Ignored by the native control, which follows the device. */
  locale?: string;
  /** Earliest allowed ISO day. Typed dates before it are rejected; the calendar greys them out. */
  min?: string;
  /** Latest allowed ISO day. Typed dates after it are rejected; the calendar greys them out. */
  max?: string;
  /** Blocks single days (weekends, holidays, booked days): typed, stepped or picked ones are rejected like out-of-range dates. The browser's own picker can't grey them out; `DatePicker`'s calendar does. */
  isDateDisabled?: (iso: string) => boolean;
  /**
   * What the calendar button opens. `native` (default): the browser's own date picker, restricted
   * to `min`/`max`, in the browser's language. `calendar`: our `Calendar` in a popover, in `locale`,
   * with `isDateDisabled` days greyed out and the week starting like `locale` says. It is loaded
   * only when first needed. Touch devices get the native control either way (see `native`).
   */
  picker?: "native" | "calendar";
  /** `picker="calendar"`: portal target of the popover. Pass the Dialog/Sheet content element when used inside one. */
  container?: HTMLElement | null;
  /** `picker="calendar"`: first weekday, 0 = Sunday. Defaults to the locale's. */
  weekStartsOn?: CalendarProps["weekStartsOn"];
  /** `picker="calendar"`: "today" for the marker and the default month. Defaults to the local day. */
  today?: CalendarProps["today"];
  /** `picker="calendar"`: popover and calendar motion. `false` turns it off. @default true */
  animated?: boolean;
  /** Shows the error text under the field when the entry is rejected. Turn off to render it yourself (e.g. via `onInvalidChange`). Default `true`. */
  showError?: boolean;
  /** Translations for the error messages and the calendar button. */
  labels?: Partial<DateInputLabels>;
  /**
   * `auto` (default) uses the browser's own `<input type="date">` on touch devices
   * (`pointer: coarse`), where its wheel/calendar is far better than a typed field, and
   * the typed `locale` field elsewhere. `always` / `never` force one of them.
   */
  native?: "auto" | "always" | "never";
  /**
   * Renders just the typed `<input>`: no wrapper, calendar button or error message, and `className`
   * goes on the input. For embedding in a group that brings its own calendar (`DatePicker`,
   * `DateRangePicker`); pair it with `onInvalidChange` to show the error yourself. Implies `native="never"`.
   */
  bare?: boolean;
}

export const toDay = (iso: string | undefined): string => iso?.slice(0, 10) ?? "";

const COARSE = "(pointer: coarse)";
const subscribeCoarse = (listener: () => void): (() => void) => {
  const mq = typeof window !== "undefined" ? window.matchMedia?.(COARSE) : undefined;
  mq?.addEventListener("change", listener);
  return () => mq?.removeEventListener("change", listener);
};
const isCoarse = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.(COARSE).matches;

/** True on touch-first devices. Server render and hydration see `false`, then it corrects itself. */
export const useCoarsePointer = (): boolean => useSyncExternalStore(subscribeCoarse, isCoarse, () => false);

export const errorMessage = (error: DateInputError | null, l: DateInputLabels): string =>
  error === "invalid" ? l.invalid : error === "range" ? l.outOfRange : error === "disabled" ? l.unavailable : "";

export const DateInputMessage = ({ id, message }: { id: string; message: string }): ReactElement => (
  <p id={id} role="alert" className="mt-1 text-xs text-destructive">
    {message}
  </p>
);

/** Tabular digits so dates line up in columns, a 150 ms focus-ring fade, and the invalid look. */
export const invalidClass =
  "tabular-nums transition-[color,background-color,border-color,box-shadow] duration-150 ease-out aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive";
