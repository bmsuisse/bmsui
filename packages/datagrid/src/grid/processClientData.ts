import { compareValues, evaluateFilter, getFieldValue } from "../filter/evaluate";
import type { GridState, SortDescriptor } from "../filter/types";

/** Multi-column comparator: earlier entries in `sort` take priority; nulls always sort last. */
function makeComparator<TRow>(sort: readonly SortDescriptor[]): (a: TRow, b: TRow) => number {
  return (a, b) => {
    for (const { field, dir } of sort) {
      const av = getFieldValue(a, field);
      const bv = getFieldValue(b, field);
      const aNull = av === null || av === undefined;
      const bNull = bv === null || bv === undefined;
      if (aNull && bNull) continue;
      if (aNull) return 1;
      if (bNull) return -1;
      const cmp = compareValues(av, bv) ?? 0;
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
    }
    return 0;
  };
}

export interface ClientProcessingResult<TRow> {
  rows: TRow[];
  rowCount: number;
}

/**
 * Applies a `GridState` to an in-memory row array: filter (via
 * `evaluateFilter`, matching sql.py/meili.py semantics), then multi-column
 * sort, then pagination. This is the entire implementation of `"client"`
 * DataSource mode — `"server"` mode skips this and trusts the caller.
 */
export function processClientData<TRow>(
  data: readonly TRow[],
  state: GridState,
): ClientProcessingResult<TRow> {
  const filtered = state.filter ? data.filter((row) => evaluateFilter(row, state.filter)) : data;
  const sorted = state.sort.length > 0 ? [...filtered].sort(makeComparator(state.sort)) : filtered;
  const start = state.page * state.pageSize;
  const rows = sorted.slice(start, start + state.pageSize);
  return { rows, rowCount: sorted.length };
}
