/**
 * Client-mode filter evaluator. This is the `"client"` DataSource's answer to
 * `sql.py`'s `build_select`/`build_count` and `meili.py`'s
 * `build_filter_expr` — same contract (CompositeFilterDescriptor /
 * FilterDescriptor), same operator semantics, applied in-memory instead of
 * pushed down to a query engine.
 *
 * The operator semantics implemented here MUST stay identical to the Python
 * side (see bmsdna/datagrid/sql.py and bmsdna/datagrid/meili.py) — that's the
 * whole point of "client" and "server" DataSource modes being interchangeable
 * from the caller's perspective. Key semantics, spelled out because they're
 * easy to get subtly wrong:
 *   - `contains`/`startsWith`/`endsWith` are case-sensitive unless `ignoreCase`.
 *   - `between` is inclusive on both ends.
 *   - `isNull`/`isNotNull` treat both `null` and `undefined` as "null".
 *   - `isEmpty`/`isNotEmpty` treat `null`/`undefined`/`""`/`[]` as "empty".
 *   - Every operator (including `eq`/`in`/`neq`/`notIn`/`doesNotContain`) is
 *     false against a `null`/`undefined` row value, except the explicitly
 *     null-aware operators themselves. This mirrors SQL's three-valued logic
 *     collapsed into a WHERE clause: a comparison against NULL is UNKNOWN,
 *     which always excludes the row — including for negated comparisons
 *     like `<> `/`NOT IN`/`NOT LIKE`, which is easy to get backwards.
 */
import { parseISO } from "date-fns";
import type { CompositeFilterDescriptor, FilterDescriptor } from "./types";
import { fieldKey, isCompositeFilterDescriptor } from "./types";

/**
 * Resolves a (possibly pre-qualified/nested) field path against a row.
 * Exported for reuse by <DataGrid>'s client-mode sort comparator, which
 * needs the exact same field resolution the filter evaluator uses.
 */
export function getFieldValue(row: unknown, field: string | string[]): unknown {
  const segments = fieldKey(field).split(".");
  let current: unknown = row;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined;
}

function isEmptyValue(value: unknown): boolean {
  if (isNullish(value)) return true;
  if (typeof value === "string") return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Converts a Date, or a string/number parseable as one, to epoch milliseconds.
 *
 * Strings go through date-fns's `parseISO` rather than the bare `new
 * Date(value)` constructor: a `"YYYY-MM-DD"` string is parsed by the JS spec
 * as UTC midnight, not local midnight, but `DateRangeFilter` always
 * serializes date-only bounds in *local* time (via date-fns `format`) — so
 * naively parsing one back with `new Date(value)` would shift it by the
 * local UTC offset (e.g. a "Today" filter bound of `"2024-06-15"` would
 * parse to 2024-06-14T20:00 local in a timezone behind UTC, excluding rows
 * that are actually on the 15th). `parseISO` treats a date-only string as
 * local midnight, matching how it was serialized — the same fix
 * `DateRangeFilter`'s own `parseBound` applies for that widget's *display*,
 * shared here via the same date-fns function instead of a second hand-rolled
 * copy of the "append a local-time marker" logic.
 */
function toEpochMs(value: unknown): number | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }
  return null;
}

/** A string is "numeric" if it round-trips through Number() to a finite value (and isn't blank/whitespace). */
function asFiniteNumber(value: number | string): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Normalizes a non-Date value to something orderable: a number or a string. */
function normalizeForCompare(value: unknown): number | string | null {
  if (isNullish(value)) return null;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value);
}

/**
 * Orders two values. Returns null when either side is nullish, or can't be
 * compared at all (callers treat that as "the comparison doesn't hold").
 *
 * When either side is an actual `Date` instance, both sides are parsed as
 * dates and compared chronologically (via epoch ms) — comparing a `Date` to
 * an ISO string by normalizing the `Date` to a number would compare a
 * stringified epoch-ms number against the ISO string lexicographically,
 * which is nonsensical. When neither side is a `Date`, ISO 8601 date/
 * datetime strings already sort correctly under plain string comparison, so
 * no date parsing is needed (or safe to assume) there. If exactly one side
 * normalizes to a number, the other is still tried as a numeric string (e.g.
 * a row value that arrived as `"9"` via JSON/CSV/query-string, compared
 * against a NumberRangeFilter's literal `10`) — without this, `"9" > "10"`
 * lexicographically, inverting every gt/lt/gte/lte/between verdict for a
 * column whose values aren't consistently typed.
 *
 * Exported for reuse by <DataGrid>'s client-mode sort comparator.
 */
export function compareValues(a: unknown, b: unknown): number | null {
  if (a instanceof Date || b instanceof Date) {
    const ta = toEpochMs(a);
    const tb = toEpochMs(b);
    return ta === null || tb === null ? null : ta - tb;
  }
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === null || nb === null) return null;
  const numA = asFiniteNumber(na);
  const numB = asFiniteNumber(nb);
  if (numA !== null && numB !== null) return numA - numB;
  const sa = String(na);
  const sb = String(nb);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

function valuesEqual(rowValue: unknown, target: unknown, ignoreCase: boolean | undefined): boolean {
  if (ignoreCase && typeof rowValue === "string" && typeof target === "string") {
    return rowValue.toLowerCase() === target.toLowerCase();
  }
  if (rowValue === target) return true;
  // Falls back to the same numeric-string/Date coercion compareValues uses
  // for gt/lt/between — without this, a row value that arrived as the
  // string "9" would fail eq/in against the number 9 (`"9" === 9` is
  // false) while correctly satisfying gt/lt against the same pair, an
  // inconsistency between operators that are supposed to agree.
  return compareValues(rowValue, target) === 0;
}

function stringMatch(
  rowValue: unknown,
  needle: unknown,
  ignoreCase: boolean | undefined,
  test: (haystack: string, needle: string) => boolean,
): boolean {
  if (typeof rowValue !== "string" || typeof needle !== "string") return false;
  const haystack = ignoreCase ? rowValue.toLowerCase() : rowValue;
  const target = ignoreCase ? needle.toLowerCase() : needle;
  return test(haystack, target);
}

function isTwoElementArray(value: unknown): value is [unknown, unknown] {
  return Array.isArray(value) && value.length === 2;
}

function evaluateLeaf<TRow>(row: TRow, filter: FilterDescriptor): boolean {
  const rowValue = getFieldValue(row, filter.field);
  const { operator, value, ignoreCase } = filter;

  switch (operator) {
    case "isNull":
      return isNullish(rowValue);
    case "isNotNull":
      return !isNullish(rowValue);
    case "isEmpty":
      return isEmptyValue(rowValue);
    case "isNotEmpty":
      return !isEmptyValue(rowValue);

    case "eq":
      return !isNullish(rowValue) && valuesEqual(rowValue, value, ignoreCase);
    case "neq":
      return !isNullish(rowValue) && !valuesEqual(rowValue, value, ignoreCase);

    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      const cmp = compareValues(rowValue, value);
      if (cmp === null) return false;
      if (operator === "lt") return cmp < 0;
      if (operator === "lte") return cmp <= 0;
      if (operator === "gt") return cmp > 0;
      return cmp >= 0;
    }

    case "between": {
      if (isNullish(rowValue) || !isTwoElementArray(value)) return false;
      const [boundA, boundB] = value;
      const cmpA = compareValues(rowValue, boundA);
      const cmpB = compareValues(rowValue, boundB);
      if (cmpA === null || cmpB === null) return false;
      // Order-independent on purpose: a hand-built or saved FilterDescriptor
      // (anything other than NumberRangeFilter's own guarded emit path) may
      // carry its bounds as [larger, smaller]; treating that as "matches
      // nothing" rather than as the equivalent valid range is a real, easy
      // mistake to make (see NumberRangeFilter's descriptorFor for the UI
      // widget's side of this same guard).
      return (cmpA >= 0 && cmpB <= 0) || (cmpA <= 0 && cmpB >= 0);
    }

    case "in":
      return (
        !isNullish(rowValue) &&
        Array.isArray(value) &&
        value.some((candidate) => valuesEqual(rowValue, candidate, ignoreCase))
      );
    case "notIn":
      return (
        !isNullish(rowValue) &&
        Array.isArray(value) &&
        !value.some((candidate) => valuesEqual(rowValue, candidate, ignoreCase))
      );

    case "contains":
      return stringMatch(rowValue, value, ignoreCase, (h, n) => h.includes(n));
    case "doesNotContain":
      return !isNullish(rowValue) && !stringMatch(rowValue, value, ignoreCase, (h, n) => h.includes(n));
    case "startsWith":
      return stringMatch(rowValue, value, ignoreCase, (h, n) => h.startsWith(n));
    case "endsWith":
      return stringMatch(rowValue, value, ignoreCase, (h, n) => h.endsWith(n));
  }
}

/**
 * Evaluates a filter tree (leaf or composite, or `null`/`undefined` for "no
 * filter") against a single row. Used by `<DataGrid>` in `"client"` mode;
 * `"server"` mode never calls this — it trusts the caller already applied
 * the equivalent filter server-side.
 */
export function evaluateFilter<TRow>(
  row: TRow,
  filter: CompositeFilterDescriptor | FilterDescriptor | null | undefined,
): boolean {
  if (!filter) return true;
  if (isCompositeFilterDescriptor(filter)) {
    return filter.logic === "and"
      ? filter.filters.every((child) => evaluateFilter(row, child))
      : filter.filters.some((child) => evaluateFilter(row, child));
  }
  return evaluateLeaf(row, filter);
}
