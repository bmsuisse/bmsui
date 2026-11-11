// Pure ISO-day arithmetic for the Calendar (no Date objects leak out, no
// timezone surprises: every Date here is built from local y/m/d at noon-free
// midnight and only read back with local getters).

import { toLocalIsoDay } from "./dateField";

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** ISO day (or datetime) -> local Date at midnight; null for anything else. */
export function isoToDate(iso: string): Date | null {
  const m = ISO_DAY.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDays(iso: string, days: number): string {
  const d = isoToDate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return toLocalIsoDay(d);
}

/** Same day `months` later, clamped to that month's last day (31 Jan + 1 -> 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const d = isoToDate(iso);
  if (!d) return iso;
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return toLocalIsoDay(target);
}

/** `yyyy-mm-01` of the month containing `iso`. */
export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

const SUNDAY_FIRST_REGIONS = new Set([
  "US", "CA", "MX", "BR", "JP", "KR", "TW", "HK", "IL", "PH", "IN", "ZA", "AU", "SA", "PE", "CO", "AR",
]);

/**
 * First day of the week for a locale, 0 = Sunday … 6 = Saturday. Uses
 * `Intl.Locale#getWeekInfo` where available (Monday for de-CH, Sunday for en-US),
 * otherwise a small region table (Monday by default).
 */
export function weekStartOf(locale: string): number {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    if (info?.firstDay) return info.firstDay % 7;
    const region = loc.maximize().region;
    return region && SUNDAY_FIRST_REGIONS.has(region) ? 0 : 1;
  } catch {
    return 1;
  }
}

/** Six weeks of ISO days covering the month of `monthIso`, starting on `weekStart`. Always 42 days so the grid height never jumps. */
export function monthGrid(monthIso: string, weekStart: number): string[][] {
  const first = isoToDate(startOfMonth(monthIso)) ?? new Date();
  const offset = (first.getDay() - weekStart + 7) % 7;
  const start = addDays(toLocalIsoDay(first), -offset);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

/** Short weekday names in week order (`Mo`…`So` for de-CH starting Monday). */
export function weekdayNames(locale: string, weekStart: number, width: "short" | "narrow" | "long" = "short"): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: width });
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + ((weekStart + i) % 7))).replace(/\.$/, ""));
}

export function monthTitle(monthIso: string, locale: string): string {
  const d = isoToDate(monthIso) ?? new Date();
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(d);
}

/** Full spoken date for a day button's aria-label (`Dienstag, 10. November 2026`). */
export function longDayLabel(iso: string, locale: string): string {
  const d = isoToDate(iso);
  return d ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d) : iso;
}

/** Day of week of an ISO day, 0 = Sunday. */
export function dayOfWeek(iso: string): number {
  return isoToDate(iso)?.getDay() ?? 0;
}
