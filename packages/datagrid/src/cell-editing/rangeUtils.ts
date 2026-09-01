import type { CellAddress, CellRange } from "./types";

/** Maps each id to its position in `ids` — built once per (rowIds|columnIds) identity change, then reused for every lookup during a drag, rather than an O(n) `indexOf` per cell per mousemove. */
export function buildIndexMap(ids: string[]): Map<string, number> {
  const map = new Map<string, number>();
  ids.forEach((id, index) => map.set(id, index));
  return map;
}

/** A `CellRange`'s two corners resolved to ordinal row/column indices, with `start <= end` on both axes regardless of which corner `anchor`/`focus` was. */
export interface NormalizedRange {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

/**
 * Resolves a `CellRange` to ordinal indices via `rowIndex`/`columnIndex`
 * (from `buildIndexMap`), or `undefined` if either endpoint's row or column
 * id no longer exists — e.g. the row was removed from `data` since the
 * selection was made.
 */
export function normalizeRange(
  range: CellRange,
  rowIndex: Map<string, number>,
  columnIndex: Map<string, number>,
): NormalizedRange | undefined {
  const anchorRow = rowIndex.get(range.anchor.rowId);
  const focusRow = rowIndex.get(range.focus.rowId);
  const anchorCol = columnIndex.get(range.anchor.columnId);
  const focusCol = columnIndex.get(range.focus.columnId);
  if (anchorRow === undefined || focusRow === undefined || anchorCol === undefined || focusCol === undefined) {
    return undefined;
  }
  return {
    rowStart: Math.min(anchorRow, focusRow),
    rowEnd: Math.max(anchorRow, focusRow),
    colStart: Math.min(anchorCol, focusCol),
    colEnd: Math.max(anchorCol, focusCol),
  };
}

/** True if `cell` falls inside `range` (inclusive on all sides). */
export function isCellInRange(
  cell: CellAddress,
  range: CellRange,
  rowIndex: Map<string, number>,
  columnIndex: Map<string, number>,
): boolean {
  const normalized = normalizeRange(range, rowIndex, columnIndex);
  if (!normalized) return false;
  const row = rowIndex.get(cell.rowId);
  const col = columnIndex.get(cell.columnId);
  if (row === undefined || col === undefined) return false;
  return row >= normalized.rowStart && row <= normalized.rowEnd && col >= normalized.colStart && col <= normalized.colEnd;
}

/** Every cell address inside `range`, in row-major order (top-to-bottom, left-to-right), skipping the row-major walk entirely once `normalizeRange` can't resolve either endpoint. */
export function cellsInRange(
  range: CellRange,
  rowIds: string[],
  columnIds: string[],
  rowIndex: Map<string, number>,
  columnIndex: Map<string, number>,
): CellAddress[] {
  const normalized = normalizeRange(range, rowIndex, columnIndex);
  if (!normalized) return [];
  const cells: CellAddress[] = [];
  for (let r = normalized.rowStart; r <= normalized.rowEnd; r++) {
    const rowId = rowIds[r];
    if (rowId === undefined) continue;
    for (let c = normalized.colStart; c <= normalized.colEnd; c++) {
      const columnId = columnIds[c];
      if (columnId === undefined) continue;
      cells.push({ rowId, columnId });
    }
  }
  return cells;
}

/**
 * Extends a fill-handle drag's `base` range (the source selection, already
 * normalized) toward `target`, locked to whichever single axis — row or
 * column — has the larger overshoot past `base`'s own edge on that axis.
 * Matches Excel/Sheets' own autofill behavior: dragging the fill handle
 * never extends diagonally, only straight down/up/left/right from the
 * source range. Returns `base` unchanged if `target` is inside or on its
 * border (no overshoot on either axis).
 */
export function extendRangeForFill(base: NormalizedRange, target: { row: number; col: number }): NormalizedRange {
  const rowOvershoot = Math.max(0, base.rowStart - target.row, target.row - base.rowEnd);
  const colOvershoot = Math.max(0, base.colStart - target.col, target.col - base.colEnd);
  if (rowOvershoot === 0 && colOvershoot === 0) return base;
  if (rowOvershoot >= colOvershoot) {
    return {
      rowStart: Math.min(base.rowStart, target.row),
      rowEnd: Math.max(base.rowEnd, target.row),
      colStart: base.colStart,
      colEnd: base.colEnd,
    };
  }
  return {
    rowStart: base.rowStart,
    rowEnd: base.rowEnd,
    colStart: Math.min(base.colStart, target.col),
    colEnd: Math.max(base.colEnd, target.col),
  };
}
