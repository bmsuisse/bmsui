const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
/** Future values this close are clock skew, not a scheduled instant: show "now". */
const FUTURE_SKEW = 30;

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
  else if (abs < MONTH) [count, unit] = [Math.floor(abs / DAY), "day"];
  else if (abs < YEAR) [count, unit] = [Math.floor(abs / MONTH), "month"];
  else [count, unit] = [Math.floor(abs / YEAR), "year"];
  const value = diff < 0 ? count : -count;
  // "gestern"/"yesterday" reads better than "vor 1 Tag".
  const numeric = unit === "day" && Math.abs(value) === 1 ? "auto" : "always";
  return formatter(locale, style, numeric).format(value, unit);
}

/** How long until the relative text can change: refresh often while it counts seconds/minutes, rarely after. */
export function relativeRefreshInterval(date: Date, now: Date): number {
  const abs = Math.abs(now.getTime() - date.getTime()) / 1000;
  if (abs < MINUTE) return 10_000;
  if (abs < HOUR) return 30_000;
  if (abs < DAY) return 5 * 60_000;
  return 60 * 60_000;
}
