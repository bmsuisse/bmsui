// Date entry in a given locale: the value stays an ISO day (yyyy-mm-dd), the
// field shows and reads the locale's own order (dd.mm.yyyy for de-CH). Pure, so
// it can be unit-tested; `patterns/date-input/DateInput.tsx` is the control.
// Ported from OneDocs' `lib/dateField.ts`.

type Part = "day" | "month" | "year";

interface Layout {
  order: Part[];
  separator: string;
}

const layoutCache = new Map<string, Layout>();

export function layoutOf(locale: string): Layout {
  const cached = layoutCache.get(locale);
  if (cached) return cached;
  const parts = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(
    new Date(2001, 1, 3),
  );
  const order = parts
    .filter((p) => p.type === "day" || p.type === "month" || p.type === "year")
    .map((p) => p.type as Part);
  const separator = parts.find((p) => p.type === "literal")?.value.trim() || ".";
  const layout = { order, separator };
  layoutCache.set(locale, layout);
  return layout;
}

const WORD: Record<Part, string> = { day: "dd", month: "mm", year: "yyyy" };

/** "dd.mm.yyyy" for de-CH, "mm/dd/yyyy" for en-US. */
export function datePlaceholder(locale: string): string {
  const { order, separator } = layoutOf(locale);
  return order.map((part) => WORD[part]).join(separator);
}

const pad = (n: number, width: number): string => String(n).padStart(width, "0");

/** An ISO day (or the date part of an ISO datetime) as the field shows it; empty string for anything else. */
export function formatIsoDay(iso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(iso);
  if (!match) return "";
  const { order, separator } = layoutOf(locale);
  const [, year = "", month = "", day = ""] = match;
  const value: Record<Part, string> = { year, month, day };
  return order.map((part) => value[part]).join(separator);
}

const isRealDay = (year: number, month: number, day: number): boolean => {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

/** Two-digit years up to this many years ahead of today land in this century; later ones in the last (`99` -> 1999). */
const TWO_DIGIT_YEAR_LOOKAHEAD = 20;

function expandYear(raw: string): number {
  const n = Number(raw);
  if (raw.length > 2) return n;
  const now = new Date().getFullYear();
  const century = Math.floor(now / 100) * 100;
  return century + n > now + TWO_DIGIT_YEAR_LOOKAHEAD ? century - 100 + n : century + n;
}

/** `03022026` / `030226` split in the locale's order (day and month two digits each). */
function splitDigits(digits: string, order: Part[]): string[] | null {
  if (digits.length !== 6 && digits.length !== 8) return null;
  const width: Record<Part, number> = { day: 2, month: 2, year: digits.length - 4 };
  const out: string[] = [];
  let at = 0;
  for (const part of order) {
    out.push(digits.slice(at, at + width[part]));
    at += width[part];
  }
  return out;
}

/**
 * Typed text -> ISO day, or null when it isn't a real date. Accepts the
 * locale's order, two-digit years (`3.2.26` -> 2026, `1.2.99` -> 1999), any run
 * of `. / -` or spaces as separator (`3. 2. 2026`), bare digits (`03022026`,
 * `030226`), ISO days and ISO datetimes (date part only).
 */
export function parseIsoDay(text: string, locale: string): string | null {
  const trimmed = text.trim().replace(/\.$/, "");
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(trimmed);
  let year: number;
  let month: number;
  let day: number;
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else {
    const { order } = layoutOf(locale);
    const typed = /^(\d{1,4})[./\-\s]+(\d{1,2})[./\-\s]+(\d{1,4})$/.exec(trimmed);
    const raw = typed ? [typed[1] ?? "", typed[2] ?? "", typed[3] ?? ""] : /^\d+$/.test(trimmed) ? splitDigits(trimmed, order) : null;
    if (!raw) return null;
    const at = (part: Part): string => raw[order.indexOf(part)] ?? "";
    year = expandYear(at("year"));
    month = Number(at("month"));
    day = Number(at("day"));
  }
  if (year < 1000 || year > 9999 || !isRealDay(year, month, day)) return null;
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/**
 * Local calendar day as ISO. Not `d.toISOString().slice(0, 10)`: that is the
 * UTC day, which in Swiss time is still "yesterday" after 22:00/23:00.
 */
export function toLocalIsoDay(d: Date): string {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}
