import { useMemo } from "react";
import type { ColumnDef } from "../column/types";
import type { ColumnVisibility } from "../column-selector/types";
import { applyColumnOrder } from "../column-selector/ordering";
import { isColumnVisible } from "../column-selector/visibility";

/**
 * Single source of truth for "which columns actually render" — filters
 * `columns` down to whatever `columnVisibility` marks visible, or returns
 * `columns` unchanged when `columnVisibility` is omitted. `columnOrder` (ids
 * in display order, e.g. driven by a `<ColumnSelector>`'s drag-to-reorder)
 * reorders the result first; see `applyColumnOrder` for how stale/missing ids
 * are handled. Shared between
 * `<DataGrid>` and `<TreeDataGrid>` so both read `columnVisibility` (e.g.
 * driven by a `<ColumnSelector>`) the same way.
 */
export function useVisibleColumns<TRow>(
  columns: ColumnDef<TRow>[],
  columnVisibility: ColumnVisibility | undefined,
  columnOrder?: readonly string[],
): ColumnDef<TRow>[] {
  return useMemo(() => {
    const ordered = columnOrder ? applyColumnOrder(columns, columnOrder) : columns;
    return columnVisibility
      ? ordered.filter((column) => isColumnVisible(columnVisibility, column.id))
      : ordered;
  }, [columns, columnVisibility, columnOrder]);
}
