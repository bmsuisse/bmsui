const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
/** Future values this close are clock skew, not a scheduled instant: show "now". */
const FUTURE_SKEW = 30;

/** Whole local calendar days from `date` to `now` (positive = past), ignoring the time of day and DST. */
function calendarDayDiff(date: Date, now: Date): number {
  const day = (d: Date): number => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(now) - day(date)) / (DAY * 1000));
}

export type RelativeTimeStyle = "long" | "short" | "narrow";

const cache = new Map<string, Intl.RelativeTimeFormat>();
function formatter(locale: string, style: RelativeTimeStyle, numeric: "auto" | "always"): Intl.RelativeTimeFormat {
  const key = `${locale}|${style}|${numeric}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.RelativeTimeFormat(locale, { style, numeric });
    cache.set(key, f);
  }
  return f;
}

/**
 * "vor 5 Min." / "5 min. ago" / "in 2 Tagen": picks the largest whole unit and lets
 * `Intl.RelativeTimeFormat` do the wording. Behaviour follows Astryx's Timestamp.
 */
export function formatRelativeTime(
  date: Date,
  now: Date,
  locale: string,
  style: RelativeTimeStyle = "short",
): string {
  const diff = Math.round((now.getTime() - date.getTime()) / 1000);
  const abs = Math.abs(diff);
  if (abs < 10 || (diff < 0 && abs <= FUTURE_SKEW)) {
    return formatter(locale, style, "auto").format(0, "second");
  }
  let count: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (abs < MINUTE) [count, unit] = [abs, "second"];
  else if (abs < HOUR) [count, unit] = [Math.floor(abs / MINUTE), "minute"];
  else if (abs < DAY) [count, unit] = [Math.floor(abs / HOUR), "hour"];
  else {
    // From one day on, count calendar days in the viewer's time zone, so Monday 23:30
    // seen on Wednesday 01:00 is "vorgestern", not "gestern" (25.5 elapsed hours).
    // At least 1: 24+ elapsed hours are never "today" (e.g. across a 25h DST day).
    const days = Math.max(1, Math.abs(calendarDayDiff(date, now)));
    if (days < MONTH / DAY) [count, unit] = [days, "day"];
    else if (days < YEAR / DAY) [count, unit] = [Math.floor(days / (MONTH / DAY)), "month"];
    else [count, unit] = [Math.floor(days / (YEAR / DAY)), "year"];
  }
  const value = diff < 0 ? count : -count;
  // "gestern"/"vorgestern"/"yesterday" read better than "vor 1 Tag"/"vor 2 Tagen" (locales without a word fall back to the number).
  const numeric = unit === "day" && Math.abs(value) <= 2 ? "auto" : "always";
  return formatter(locale, style, numeric).format(value, unit);
}

/** How long until the relative text can change: refresh often while it counts seconds/minutes, rarely after. */
export function relativeRefreshInterval(date: Date, now: Date): number {
  const abs = Math.abs(now.getTime() - date.getTime()) / 1000;
  if (abs < MINUTE) return 10_000;
  if (abs < HOUR) return 30_000;
  if (abs < DAY) return 5 * 60_000;
  // Day counts flip at local midnight: refresh hourly, or right after midnight if sooner.
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  return Math.max(1_000, Math.min(60 * 60_000, midnight - now.getTime() + 1_000));
}
