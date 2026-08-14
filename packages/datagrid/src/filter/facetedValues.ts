import { getColumnValue } from "../column/types";
import type { ColumnDef } from "../column/types";
import { evaluateFilter } from "./evaluate";
import { fieldKey, isCompositeFilterDescriptor } from "./types";
import type { CompositeFilterDescriptor, FilterDescriptor } from "./types";

type FilterNode = FilterDescriptor | CompositeFilterDescriptor;

/** Removes every leaf filter on `columnId` from a filter tree; returns `null` if nothing is left. */
function withoutColumn(filter: FilterNode | null | undefined, columnId: string): FilterNode | null {
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
