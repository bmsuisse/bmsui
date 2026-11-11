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
 * Swiss `50.-` / `50.–` read as 50. With `formatOptions`, the formatter's own
 * currency, unit, `%` and literal text is ignored, so the field reads its own
 * display (`CHF 1'234.50`, `1'234.5 kg`); `style: "percent"` reads `12%` as 0.12.
 */
export function parseLocaleNumber(
  text: string,
  locale: string,
  formatOptions?: Intl.NumberFormatOptions,
): number | null {
  let s = text.normalize("NFKC");
  // Accounting style shows negatives as `($1,234.50)`; read the parentheses as a minus sign
  // before they are stripped as formatting literals.
  const accounting = formatOptions?.currencySign === "accounting" && /^\s*\(.*\)\s*$/.test(s);
  if (accounting) s = s.trim().slice(1, -1);
  for (const affix of formatAffixes(locale, formatOptions)) s = s.split(affix).join(" ");
  s = s.trim().replace(/[−–—]/g, "-");
  // Swiss whole amounts: `50.-` / `50.–` mean 50.
  s = s.replace(/[.,]-+$/, "");
  if (!s) return null;
  const parsed = parsePlainNumber(s, locale);
  if (parsed == null) return parsed;
  const signed = accounting && parsed > 0 ? -parsed : parsed;
  // The field shows `12%` for 0.12: read it back the same way.
  return formatOptions?.style === "percent" ? shiftDecimal(signed, -2) : signed;
}

const affixCache = new Map<string, string[]>();
const AFFIX_TYPES = new Set(["literal", "currency", "unit", "percentSign"]);

/** Currency codes/symbols, units, `%` and literals the formatter puts around the digits. */
function formatAffixes(locale: string, formatOptions?: Intl.NumberFormatOptions): string[] {
  if (!formatOptions) return [];
  const key = `${locale}|${JSON.stringify(formatOptions)}`;
  const cached = affixCache.get(key);
  if (cached) return cached;
  const affixes = new Set<string>();
  try {
    const formatter = new Intl.NumberFormat(locale, formatOptions);
    for (const sample of [1, 1234.5, -1234.5, 0]) {
      for (const part of formatter.formatToParts(sample)) {
        const value = part.value.normalize("NFKC").trim();
        // Never strip separators or signs that a literal might happen to be.
        if (AFFIX_TYPES.has(part.type) && value && !/^[\d.,'’+\-−]+$/.test(value)) affixes.add(value);
      }
    }
  } catch {
    // Invalid options: parse the text as is.
  }
  // Longest first, so `CHF` goes before a contained `F`.
  const list = [...affixes].sort((a, b) => b.length - a.length);
  affixCache.set(key, list);
  return list;
}

/** `n * 10^exponent` by moving the decimal point (no `1.005 * 100 = 100.49999…`). */
function shiftDecimal(n: number, exponent: number): number {
  const [mantissa = "0", exp = "0"] = String(n).toLowerCase().split("e");
  return Number(`${mantissa}e${Number(exp) + exponent}`);
}

/** Round to `decimals` places, halves away from zero, on the decimal digits as written (`1.005` -> `1.01`). */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const sign = value < 0 ? -1 : 1;
  return sign * shiftDecimal(Math.round(shiftDecimal(Math.abs(value), decimals)), -decimals);
}

function parsePlainNumber(input: string, locale: string): number | null {
  let s = input;
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
