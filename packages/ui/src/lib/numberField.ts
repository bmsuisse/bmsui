// Number entry in a given locale: the value stays a JS number, the field shows
// the locale's grouping (de-CH: 1’234.5) and reads what people actually type
// (`1234,5`, `1'234.50`, `1 234`). Pure, so it can be unit-tested;
// `patterns/number-input/NumberInput.tsx` is the control. Rules follow Astryx's
// numberParser in spirit, simplified to the separators Swiss/European apps see.

interface NumberSymbols {
  group: string;
  decimal: string;
}

const symbolCache = new Map<string, NumberSymbols>();

/** The locale's own grouping and decimal characters (`’` and `.` for de-CH). */
export function numberSymbols(locale: string): NumberSymbols {
  const cached = symbolCache.get(locale);
  if (cached) return cached;
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const symbols = {
    group: parts.find((p) => p.type === "group")?.value ?? ",",
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
  };
  symbolCache.set(locale, symbols);
  return symbols;
}

/** `1.234.567` / `1,234`: first group 1-3 digits, every following one exactly 3. */
const isGrouped = (chunks: string[]): boolean =>
  chunks.length > 1 &&
  /^\d{1,3}$/.test(chunks[0] ?? "") &&
  chunks.slice(1).every((chunk) => /^\d{3}$/.test(chunk));

/**
 * Typed text -> number, or null when it is no number. Spaces and apostrophes
 * (`'` and `’`) are always grouping. With both `.` and `,` the last one is the
 * decimal point. A single kind repeated is grouping (and must be in groups of
 * three). One occurrence is the decimal point, except when it is the locale's
 * grouping character followed by exactly three digits (`1,234` in en-US,
 * `1.234` in de-DE). So in de-CH `1234,5`, `1234.5` and `1'234.50` all read.
 */
export function parseLocaleNumber(text: string, locale: string): number | null {
  let s = text.normalize("NFKC").trim().replace(/[−–]/g, "-");
  if (!s) return null;
  let sign = 1;
  if (s[0] === "-" || s[0] === "+") {
    if (s[0] === "-") sign = -1;
    s = s.slice(1).trimStart();
  }
  s = s.replace(/[\s'’ʼ]/g, "");
  if (!/^\d[\d.,]*$/.test(s) && !/^[.,]\d+$/.test(s)) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ",";
    const group = decimal === "." ? "," : ".";
    const [intPart = "", fraction = "", ...extra] = s.split(decimal);
    if (extra.length || !isGrouped(intPart.split(group)) || !fraction) return null;
    normalized = `${intPart.split(group).join("")}.${fraction}`;
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const chunks = s.split(sep);
    if (chunks.length > 2) {
      if (!isGrouped(chunks)) return null;
      normalized = chunks.join("");
    } else if (sep === numberSymbols(locale).group && isGrouped(chunks)) {
      normalized = chunks.join("");
    } else {
      normalized = `${chunks[0] || "0"}.${chunks[1] ?? ""}`;
      if (normalized.endsWith(".")) normalized = normalized.slice(0, -1);
    }
  } else {
    normalized = s;
  }
  const value = Number(normalized) * sign;
  return Number.isFinite(value) ? value : null;
}

export interface FormatNumberOptions {
  /** Fixed number of decimals (`2` -> `1’234.50`). */
  decimals?: number;
  /** Extra `Intl.NumberFormat` options; win over `decimals`. */
  formatOptions?: Intl.NumberFormatOptions;
}

/** A number as the field shows it; `""` for null. */
export function formatLocaleNumber(value: number | null, locale: string, options: FormatNumberOptions = {}): string {
  if (value == null || !Number.isFinite(value)) return "";
  const { decimals, formatOptions } = options;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 10,
    ...formatOptions,
  }).format(value);
}

/** Decimal places of a number as written (`0.05` -> 2), for float-safe stepping. */
export function decimalPlaces(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const [mantissa = "", exponent] = String(n).toLowerCase().split("e");
  const fraction = mantissa.split(".")[1]?.length ?? 0;
  return Math.max(0, fraction - Number(exponent ?? 0));
}

/** `value + delta` without float noise (`0.1 + 0.2` -> `0.3`). */
export function addPrecise(value: number, delta: number): number {
  const places = Math.max(decimalPlaces(value), decimalPlaces(delta));
  return Number((value + delta).toFixed(Math.min(places, 20)));
}

/** Clamp to `[min, max]`, either bound optional. */
export function clampNumber(value: number, min?: number, max?: number): number {
  if (min != null && value < min) return min;
  if (max != null && value > max) return max;
  return value;
}
