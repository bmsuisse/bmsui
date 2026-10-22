import { getColumnValue } from "../column/types";
import type { ColumnDef, EnumOption } from "../column/types";
import { defaultFormat } from "../column/format";
import { evaluateFilter } from "./evaluate";
import { fieldKey, isCompositeFilterDescriptor } from "./types";
import type { CompositeFilterDescriptor, FilterDescriptor } from "./types";

type FilterNode = FilterDescriptor | CompositeFilterDescriptor;

/** Removes every leaf filter on `columnId` from a filter tree; returns `null` if nothing is left. */
export function withoutColumn(filter: FilterNode | null | undefined, columnId: string): FilterNode | null {
  if (!filter) return null;
  if (!isCompositeFilterDescriptor(filter)) {
    return fieldKey(filter.field) === columnId ? null : filter;
  }
  const kept = filter.filters
    .map((child) => withoutColumn(child, columnId))
    .filter((child): child is FilterNode => child !== null);
  if (kept.length === 0) return null;
  return { logic: filter.logic, filters: kept };
}

/**
 * Computes the correct `allValues` input for `NumberHistogramFilter` bound
 * to `column`: `data` filtered by every OTHER currently-active filter, with
 * `column`'s own filter excluded, then that column's values extracted.
 *
 * This exists to prevent a specific, easy-to-reach bug: computing a filter
 * widget's own histogram/slider domain from a row set that's already been
 * narrowed BY that same filter means the domain shrinks every time the user
 * adjusts the range — they can never widen it back out — and if one "all
 * values" computation is naively reused across multiple numeric columns
 * (e.g. from `table.getFilteredRowModel()`), setting a filter on column A
 * also warps column B's histogram, since B's domain was computed from rows
 * A already excluded. This is the standard "faceted search" fix: a filter's
 * own facet should reflect "what could I select if I changed just this
 * filter," never a result set that filter has already narrowed.
 *
 * `filter` is the grid's full `GridState.filter` (every column's combined
 * filter) — pass it as-is; this function does the excluding.
 */
export function facetedNumberValues<TRow>(
  data: readonly TRow[],
  column: ColumnDef<TRow>,
  filter: FilterNode | null | undefined,
): (number | null)[] {
  const withoutSelf = withoutColumn(filter, column.id);
  const values: (number | null)[] = [];
  for (const row of data) {
    if (!evaluateFilter(row, withoutSelf)) continue;
    const raw = getColumnValue(column, row);
    if (typeof raw === "number") {
      values.push(Number.isFinite(raw) ? raw : null);
    } else if (raw == null) {
      values.push(null);
    } else {
      const parsed = Number(raw);
      values.push(Number.isFinite(parsed) ? parsed : null);
    }
  }
  return values;
}

/** One `facetedSetOptions` entry: an `EnumFilter` option plus how many rows carry it. */
export interface FacetOption extends EnumOption {
  count: number;
}

function selectedSetValues(filter: FilterNode | null | undefined, columnId: string): string[] {
  if (!filter) return [];
  if (isCompositeFilterDescriptor(filter)) return filter.filters.flatMap((child) => selectedSetValues(child, columnId));
  if (fieldKey(filter.field) !== columnId || !Array.isArray(filter.value)) return [];
  return filter.operator === "in" || filter.operator === "notIn" ? filter.value.map(String) : [];
}

/**
 * The distinct values of `column` with how many rows carry each, for
 * `EnumFilter`'s `options` prop — narrowed by every OTHER active filter, the
 * same faceted rule as `facetedNumberValues` (picking a value never shrinks
 * this column's own list). Values already selected in `column`'s own
 * `in`/`notIn` filter that no row carries any more stay listed with count 0,
 * so they can still be unticked.
 *
 * Values are stringified (what `EnumFilter` emits), so use it for string,
 * enum and number columns. Null/undefined values are skipped: there's no
 * "(Blank)" option, since `in`/`notIn` never match null on any engine.
 * An enum column keeps its `options` order and groups; anything else is
 * sorted by label.
 */
export function facetedSetOptions<TRow>(
  data: readonly TRow[],
  column: ColumnDef<TRow>,
  filter: FilterNode | null | undefined,
): FacetOption[] {
  const withoutSelf = withoutColumn(filter, column.id);
  const counts = new Map<string, number>();
  for (const row of data) {
    if (!evaluateFilter(row, withoutSelf)) continue;
    const raw = getColumnValue(column, row);
    if (raw === null || raw === undefined) continue;
    const value = String(raw);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  for (const value of selectedSetValues(filter, column.id)) if (!counts.has(value)) counts.set(value, 0);

  if (column.type === "enum") {
    const known = column.options
      .filter((option) => counts.has(option.value))
      .map((option) => ({ ...option, count: counts.get(option.value)! }));
    const knownValues = new Set(known.map((option) => option.value));
    const unknown = [...counts]
      .filter(([value]) => !knownValues.has(value))
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    return [...known, ...unknown];
  }
  return [...counts]
    .map(([value, count]) => ({ value, label: defaultFormat(column, value) || value, count }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}
