import { useMemo } from "react";
import type { ColumnDef } from "../column/types";
import type { ColumnVisibility } from "../column-selector/types";
import { isColumnVisible } from "../column-selector/visibility";

/**
 * Single source of truth for "which columns actually render" — filters
 * `columns` down to whatever `columnVisibility` marks visible, or returns
 * `columns` unchanged when `columnVisibility` is omitted. Shared between
 * `<DataGrid>` and `<TreeDataGrid>` so both read `columnVisibility` (e.g.
 * driven by a `<ColumnSelector>`) the same way.
 */
export function useVisibleColumns<TRow>(
  columns: ColumnDef<TRow>[],
  columnVisibility: ColumnVisibility | undefined,
): ColumnDef<TRow>[] {
  return useMemo(
    () =>
      columnVisibility ? columns.filter((column) => isColumnVisible(columnVisibility, column.id)) : columns,
    [columns, columnVisibility],
  );
}
