import { toDate, toNumber } from "../column/format";
import type { ColumnDef, EnumOption } from "../column/types";

function parseBoolean(raw: string): boolean | undefined {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "yes" || normalized === "1") return true;
  if (normalized === "false" || normalized === "no" || normalized === "0") return false;
  return undefined;
}

/** Matches a pasted/filled string against `options` by value first (exact), then by label (case-insensitive) — a paste from a real spreadsheet is far more likely to carry the human-readable label than the underlying value code. */
function matchEnumOption(options: EnumOption[], raw: string): string | undefined {
  const trimmed = raw.trim();
  const byValue = options.find((option) => option.value === trimmed);
  if (byValue) return byValue.value;
  const lowered = trimmed.toLowerCase();
  return options.find((option) => option.label.toLowerCase() === lowered)?.value;
}

// The literal text Excel/Sheets puts in a cell showing a formula error.
// Pasting one of these into any non-`string` column skips that cell, same as
// any other value that doesn't coerce — `toNumber`/`toDate`/`parseBoolean`/
// `matchEnumOption` already happen to reject all of these today (none of
// them looks like a number/date/boolean/option), but checking explicitly
// means that stays true even if one of those helpers' own "not a valid X"
// fallback changes independently later.
const EXCEL_ERROR_STRINGS = new Set(["#N/A", "#DIV/0!", "#REF!", "#VALUE!", "#NAME?", "#NULL!", "#NUM!", "#SPILL!", "#CALC!"]);

function isExcelErrorString(raw: string): boolean {
  return EXCEL_ERROR_STRINGS.has(raw.trim());
}

/**
 * Coerces one pasted/filled raw TSV cell string into the typed value a
 * column's editor/validator expects — the paste/fill equivalent of
 * `edit/registry.tsx`'s per-type dispatch, reusing the exact same `toDate`/
 * `toNumber` parsing `column/format.ts` uses for display so paste coercion
 * can't drift from what the grid already shows.
 *
 * Returns `undefined` for a value that can't be coerced at all (e.g. "abc"
 * into a number column) — the caller's job to skip that cell rather than
 * hand `onCellsChange` a `NaN`/`Invalid Date`. An empty string coerces to
 * `null` for `number`/`currency` (pasting a blank cell over a numeric one
 * clears it, matching `NumberEditor`'s own null-for-cleared convention) —
 * `string` columns instead treat an empty string as itself a valid value.
 * An Excel/Sheets error string (`#N/A`, `#DIV/0!`, etc.) pasted into any
 * column but `string` is likewise skipped rather than coerced.
 */
export function coerceValueForColumn<TRow>(column: ColumnDef<TRow>, raw: string): { value: unknown } | undefined {
  if (column.type !== "string" && isExcelErrorString(raw)) return undefined;
  switch (column.type) {
    case "string":
      return { value: raw };
    case "number":
    case "currency": {
      if (raw.trim() === "") return { value: null };
      const num = toNumber(raw);
      return num === null ? undefined : { value: num };
    }
    case "boolean": {
      const bool = parseBoolean(raw);
      return bool === undefined ? undefined : { value: bool };
    }
    case "date":
    case "datetime": {
      const date = toDate(raw);
      return date === null ? undefined : { value: date };
    }
    case "enum": {
      const matched = matchEnumOption(column.options, raw);
      return matched === undefined ? undefined : { value: matched };
    }
  }
}
