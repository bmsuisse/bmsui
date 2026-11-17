// Time-of-day entry in a given locale: the value stays `HH:mm` (24 h), the field
// shows and reads the locale's own clock (24 h for de-CH, 12 h with am/pm for
// en-US). Pure, so it can be unit-tested; `patterns/time-input/TimeInput.tsx`
// is the control. Mirrors `lib/dateField.ts`.

const pad = (n: number): string => String(n).padStart(2, "0");

const hour12Cache = new Map<string, boolean>();

/** True when the locale writes the clock with am/pm (en-US), false for 24 h (de-CH). */
export function usesHour12(locale: string): boolean {
  const cached = hour12Cache.get(locale);
  if (cached != null) return cached;
  let result = false;
  try {
    result = new Intl.DateTimeFormat(locale, { hour: "numeric" }).formatToParts(new Date(2001, 1, 3, 15)).some((p) => p.type === "dayPeriod");
  } catch {
    result = false;
  }
  hour12Cache.set(locale, result);
  return result;
}

/** Minutes since midnight for a `HH:mm` (or `HH:mm:ss`) value, or null. */
export function timeToMinutes(value: string | undefined): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value ?? "");
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h > 23 || m > 59 ? null : h * 60 + m;
}

/** `HH:mm` for minutes since midnight (clamped to the day). */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** The time part of an ISO datetime, or an `HH:mm[:ss]` value, as `HH:mm`; `""` for anything else. */
export function toTime(value: string | undefined): string {
  if (!value) return "";
  const part = /^\d{4}-\d{2}-\d{2}[T ](.*)$/.exec(value)?.[1] ?? value;
  const minutes = timeToMinutes(part.slice(0, 8));
  return minutes == null ? "" : minutesToTime(minutes);
}

/** "hh:mm" for 24 h locales, "hh:mm am" for 12 h ones. */
export function timePlaceholder(locale: string): string {
  return usesHour12(locale) ? "hh:mm am" : "hh:mm";
}

/** A `HH:mm` value as the field shows it (`14:30`, or `2:30 PM` for en-US); empty string for anything else. */
export function formatTime(value: string, locale: string): string {
  const minutes = timeToMinutes(value);
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!usesHour12(locale)) return `${pad(h)}:${pad(m)}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * Typed text -> `HH:mm`, or null when it isn't a time. Accepts `9`, `930`, `0930`,
 * `9:30`, `09.30`, `9,30`, `9h30`, `9:30:15` (seconds dropped) and an `am`/`pm`
 * suffix (`9:30 pm`, `12am`); a bare hour is `9` -> `09:00`.
 */
export function parseTime(text: string): string | null {
  const trimmed = text.trim().toLowerCase();
  const meridiem = /\s*([ap])\.?m?\.?$/.exec(trimmed);
  const body = (meridiem ? trimmed.slice(0, meridiem.index) : trimmed).trim();
  let hours: number;
  let minutes: number;
  const split = /^(\d{1,2})\s*[:.,h]\s*(\d{1,2})(?:\s*[:.,]\s*\d{1,2})?$/.exec(body);
  if (split) {
    hours = Number(split[1]);
    minutes = Number(split[2]);
  } else if (/^\d{1,4}$/.test(body)) {
    if (body.length <= 2) {
      hours = Number(body);
      minutes = 0;
    } else {
      hours = Number(body.slice(0, body.length - 2));
      minutes = Number(body.slice(-2));
    }
  } else {
    return null;
  }
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem[1] === "p" ? 12 : 0);
  }
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

/** Moves a `HH:mm` value by `by` minutes, staying inside the day (no wrap) and `min`/`max`. */
export function shiftTime(value: string, by: number, min?: string, max?: string): string {
  let next = (timeToMinutes(value) ?? 0) + by;
  const lo = timeToMinutes(min);
  const hi = timeToMinutes(max);
  if (lo != null && next < lo) next = lo;
  if (hi != null && next > hi) next = hi;
  return minutesToTime(next);
}
