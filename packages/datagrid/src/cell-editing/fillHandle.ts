import type { ColumnDef } from "../column/types";
import { getColumnValue, isEditable } from "../column/types";
import { buildIndexMap, normalizeRange } from "./rangeUtils";
import type { CellChange, CellRange } from "./types";

/**
 * Computes the `CellChange`s a fill-handle drag produces: every cell newly
 * covered by `finalRange` but not already inside `sourceRange` copies its
 * value from the corresponding source cell, TILING the source pattern across
 * the fill direction when the extension is longer than the source itself —
 * the same repeat-the-pattern behavior Excel's own fill-handle uses for a
 * multi-cell source (a single-cell source is just the degenerate case: every
 * new cell copies that one cell). Value-copy only, no numeric/date
 * auto-increment — MVP scope, matching the akeneo hand-rolled
 * implementation this feature replaces, which also only ever copies a
 * single value uniformly.
 *
 * Cells already inside `sourceRange` are left out of the result entirely —
 * they're untouched by a fill, only the newly-covered ones change.
 * A target cell that's missing, not editable, or whose source cell is
 * missing is silently skipped.
 */
export function computeFillChanges<TRow>(
  sourceRange: CellRange,
  finalRange: CellRange,
  rowIds: string[],
  columnIds: string[],
  columns: ColumnDef<TRow>[],
  getRow: (rowId: string) => TRow | undefined,
): CellChange<TRow>[] {
  const rowIndex = buildIndexMap(rowIds);
  const columnIndex = buildIndexMap(columnIds);
  const source = normalizeRange(sourceRange, rowIndex, columnIndex);
  const final = normalizeRange(finalRange, rowIndex, columnIndex);
  if (!source || !final) return [];

  const columnById = new Map(columns.map((column) => [column.id, column]));
  const sourceRowSpan = source.rowEnd - source.rowStart + 1;
  const sourceColSpan = source.colEnd - source.colStart + 1;

  /** Maps any row index in `final`'s range to the source row it tiles from — identity for a row already inside `source`, otherwise wrapping through `source`'s own rows in order, continuing in the same direction past its far edge. */
  function sourceRowFor(targetRow: number): number {
    if (targetRow >= source!.rowStart && targetRow <= source!.rowEnd) return targetRow;
    if (targetRow > source!.rowEnd) return source!.rowStart + ((targetRow - source!.rowEnd - 1) % sourceRowSpan);
    return source!.rowEnd - ((source!.rowStart - targetRow - 1) % sourceRowSpan);
  }
  function sourceColFor(targetCol: number): number {
    if (targetCol >= source!.colStart && targetCol <= source!.colEnd) return targetCol;
    if (targetCol > source!.colEnd) return source!.colStart + ((targetCol - source!.colEnd - 1) % sourceColSpan);
    return source!.colEnd - ((source!.colStart - targetCol - 1) % sourceColSpan);
  }

  const changes: CellChange<TRow>[] = [];
  for (let r = final.rowStart; r <= final.rowEnd; r++) {
    const isNewRow = r < source.rowStart || r > source.rowEnd;
    for (let c = final.colStart; c <= final.colEnd; c++) {
      const isNewCol = c < source.colStart || c > source.colEnd;
      if (!isNewRow && !isNewCol) continue; // inside the original source rectangle — untouched by the fill

      const targetRowId = rowIds[r];
      const targetColumnId = columnIds[c];
      if (targetRowId === undefined || targetColumnId === undefined) continue;
      const column = columnById.get(targetColumnId);
      const targetRow = getRow(targetRowId);
      if (!column || targetRow === undefined || !isEditable(column, targetRow)) continue;

      // Both axes matter here, not just the row one: a vertical fill (rows
      // extended, columns unchanged) has `sourceColFor(c) === c`, so
      // `sourceColumn === column` and this degenerates to "same column,
      // cycled source rows" — but a horizontal fill (columns extended, rows
      // unchanged) needs the SOURCE column's own value, not the target
      // column's, or every new column would just copy whatever (nothing)
      // already sat in its own cells instead of the pattern being extended.
      const sourceRowId = rowIds[sourceRowFor(r)];
      const sourceColumnId = columnIds[sourceColFor(c)];
      const sourceRow = sourceRowId !== undefined ? getRow(sourceRowId) : undefined;
      const sourceColumn = sourceColumnId !== undefined ? columnById.get(sourceColumnId) : undefined;
      if (sourceRow === undefined || !sourceColumn) continue;

      changes.push({
        rowId: targetRowId,
        row: targetRow,
        columnId: targetColumnId,
        previousValue: getColumnValue(column, targetRow),
        value: getColumnValue(sourceColumn, sourceRow),
      });
    }
  }
  return changes;
}
