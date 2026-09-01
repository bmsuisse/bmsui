import { parseISO } from "date-fns";
import type { ColumnAlign, ColumnDef } from "./types";

/** The default horizontal alignment for a column, based purely on its `type`. */
export function defaultAlign<TRow>(column: ColumnDef<TRow>): ColumnAlign {
  switch (column.type) {
    case "number":
    case "currency":
      return "right";
    case "boolean":
      return "center";
    case "string":
    case "enum":
    case "date":
    case "datetime":
      return "left";
  }
}

/**
 * Maps a `ColumnAlign` to its literal Tailwind utility class. Written as a
 * static lookup table rather than a template literal (`text-${align}`)
 * because Tailwind's JIT content scanner only picks up class names that
 * appear as literal strings in source — `text-right` in particular never
 * shows up as a literal anywhere else in this package, so it would be
 * silently dropped from a consuming app's build.
 */
const ALIGN_CLASS_NAME: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/** The literal Tailwind class for a column's default alignment; see `defaultAlign`. */
export function alignClassName<TRow>(column: ColumnDef<TRow>): string {
  return ALIGN_CLASS_NAME[defaultAlign(column)];
}

/**
 * Parses an arbitrary raw cell value into a `Date`, or `null` if it isn't
 * one. Exported (unlike `toNumber` below, which stays internal) because
 * `edit/DateEditor.tsx` needs the exact same date-only-vs-datetime parsing
 * this module already uses for display — a second copy would risk drifting
 * from the UTC-midnight fix documented below.
 */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    // parseISO, not `new Date(value)`: a bare "YYYY-MM-DD" string (exactly
    // what a "date" column's value looks like coming out of e.g. SQLite —
    // see the demo's created_at) is parsed by the JS spec as UTC midnight,
    // not local midnight, which shifts the *displayed* day back one in any
    // timezone behind UTC. This is the same bug already fixed for filter
    // evaluation (evaluate.ts's toEpochMs) and the filter widget's own
    // display (DateRangeFilter's parseBound) — missed here initially
    // because this is a cell-rendering path, not a filtering one, but the
    // underlying string is the same shape and needs the same fix.
    const date = parseISO(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Parses an arbitrary raw cell value into a `number`, or `null` if it isn't
 * one. Exported (unlike before) for the same reason `toDate` above is:
 * `cell-editing/coerce.ts` needs the exact same numeric parsing this module
 * already uses for display, to back paste/fill coercion without a second
 * copy that could drift from it.
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

// `new Intl.NumberFormat(...)` does locale/ICU data lookup on construction
// and is expensive enough that building one per cell, per row, per render
// (this used to happen inline in the `"currency"` case below) shows up as
// real GC/CPU pressure once a grid has more than a handful of currency
// cells on screen. Formatters are immutable and keyed only by currency code
// here (locale is always `undefined`, i.e. the runtime default), so caching
// by currency code is exact — never stale.
const currencyFormatters = new Map<string, Intl.NumberFormat>();
function currencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

/**
 * Renders a raw cell value as a display string, using the type-appropriate
 * default formatter for `column.type`. Columns with a custom `cell` render
 * function bypass this entirely — it only backs the built-in renderer.
 */
export function defaultFormat<TRow>(column: ColumnDef<TRow>, value: unknown): string {
  if (value === null || value === undefined) return "";

  switch (column.type) {
    case "string":
      return String(value);

    case "number": {
      const num = toNumber(value);
      return num === null ? String(value) : num.toLocaleString();
    }

    case "currency": {
      const num = toNumber(value);
      if (num === null) return String(value);
      return currencyFormatter(column.currency ?? "USD").format(num);
    }

    case "date": {
      const date = toDate(value);
      return date === null ? String(value) : date.toLocaleDateString();
    }

    case "datetime": {
      const date = toDate(value);
      return date === null ? String(value) : date.toLocaleString();
    }

    case "boolean": {
      // A truthy check here would render "Yes" for the *string* "false" (a
      // real shape for boolean data round-tripped through JSON/CSV/query
      // params) since any non-empty string is truthy — compare explicitly
      // instead of coercing.
      if (typeof value === "boolean") return value ? "Yes" : "No";
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return "Yes";
        if (normalized === "false") return "No";
      }
      if (typeof value === "number") return value !== 0 ? "Yes" : "No";
      return String(value);
    }

    case "enum": {
      const match = column.options.find((option) => option.value === String(value));
      return match ? match.label : String(value);
    }
  }
}
