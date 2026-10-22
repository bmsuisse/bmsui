import type { ColumnDef } from "../column/types";
import { getColumnValue } from "../column/types";
import { evaluateFilter } from "../filter/evaluate";
import type { GridState } from "../filter/types";
import { fieldKey, leafFilters } from "../filter/types";
import { processClientData } from "../grid/processClientData";

export interface FilterSortTreeOptions<TRow> {
  getRowId: (row: TRow) => string;
  getChildren: (row: TRow) => TRow[] | undefined;
  /** Filter fields and sort fields are column ids; values come through `getColumnValue`. */
  columns: readonly ColumnDef<TRow>[];
  /** Lazily loaded children by node id; wins over `getChildren`, same as `flattenTree`. */
  childrenMap?: ReadonlyMap<string, TRow[]>;
}

export interface FilteredSortedTree<TRow> {
  roots: TRow[];
  /** The kept, sorted children of every visited node — pass as `flattenTree`'s `childrenOverride`. */
  childrenMap: Map<string, TRow[]>;
  /** Nodes kept because a descendant matches; open them so the match is visible. */
  expandedIds: Set<string>;
}

const SOURCE_ROW = Symbol("row");
type Projected<TRow> = Record<string, unknown> & { [SOURCE_ROW]: TRow };

/**
 * Applies a grid's filter and sort to a tree. A node stays when it matches
 * every filter or has a descendant that does (so a match always shows under
 * its ancestors); siblings are sorted at every level. Matching and sorting go
 * through `evaluateFilter`/`processClientData`, so operators mean exactly what
 * they mean in a `"client"` `<DataGrid>`.
 *
 * Only *loaded* nodes are considered: a lazy node whose children were never
 * fetched can't reveal a match below it.
 */
export function filterSortTree<TRow>(
  roots: readonly TRow[],
  state: Pick<GridState, "filter" | "sort">,
  { getRowId, getChildren, columns, childrenMap }: FilterSortTreeOptions<TRow>,
): FilteredSortedTree<TRow> {
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const fields = [
    ...new Set([...leafFilters(state.filter).map((f) => fieldKey(f.field)), ...state.sort.map((s) => s.field)]),
  ];
  const project = (row: TRow): Projected<TRow> => {
    const record = { [SOURCE_ROW]: row } as Projected<TRow>;
    for (const field of fields) {
      const column = columnById.get(field);
      record[field] = column ? getColumnValue(column, row) : (row as Record<string, unknown>)[field];
    }
    return record;
  };
  const sortState: GridState = { filter: null, sort: state.sort, page: 0, pageSize: Number.MAX_SAFE_INTEGER };
  const sortSiblings = (rows: TRow[]): TRow[] =>
    state.sort.length > 0 && rows.length > 1
      ? processClientData(rows.map(project), sortState).rows.map((record) => record[SOURCE_ROW])
      : rows;

  const outChildren = new Map<string, TRow[]>();
  const expandedIds = new Set<string>();

  // Returns whether `row` stays.
  function visit(row: TRow): boolean {
    const id = getRowId(row);
    const children = childrenMap?.get(id) ?? getChildren(row) ?? [];
    const kept = children.filter(visit);
    if (children.length > 0) outChildren.set(id, sortSiblings(kept));
    if (kept.length > 0 && state.filter) expandedIds.add(id);
    return kept.length > 0 || !state.filter || evaluateFilter(project(row), state.filter);
  }

  const keptRoots = roots.filter(visit);
  return { roots: sortSiblings(keptRoots), childrenMap: outChildren, expandedIds };
}
