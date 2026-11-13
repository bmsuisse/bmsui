import type { ColumnDef } from "../column/types";
import { getColumnValue, isEditable } from "../column/types";
import { adaptValueForColumn, type SkippedCell } from "./adaptValue";
import { buildIndexMap, normalizeRange, type NormalizedRange } from "./rangeUtils";
import type { CellChange, CellRange } from "./types";

/**
 * How a fill-handle drag fills the newly covered cells — Excel's "Auto Fill
 * Options": `"copy"` repeats the source pattern, `"series"` continues a
 * numeric source as a linear series (step = the source's own average step, or
 * 1 for a single cell). A source that isn't numeric falls back to copying, per
 * cell.
 */
export type FillMode = "copy" | "series";

const NO_VALUE = Symbol("no-fill-value");

/** One filled cell's value plus the source cell it came from (`undefined` for a computed series value, which has no single source). */
interface FillValue<TRow> {
  value: unknown;
  source: { column: ColumnDef<TRow>; row: TRow } | undefined;
}

function isNumericColumn<TRow>(column: ColumnDef<TRow>): boolean {
  return column.type === "number" || column.type === "currency";
}

/** Rounds away float noise (0.1 + 0.2) so a decimal series stays readable. */
function tidy(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

interface Filler<TRow> {
  source: NormalizedRange;
  final: NormalizedRange;
  /** The value a fill assigns to cell `(r, c)` of `final`, or `NO_VALUE` if that cell can't be filled. */
  valueAt: (r: number, c: number) => FillValue<TRow> | typeof NO_VALUE;
  columnById: Map<string, ColumnDef<TRow>>;
}

function createFiller<TRow>(
  sourceRange: CellRange,
  finalRange: CellRange,
  rowIds: string[],
  columnIds: string[],
  columns: ColumnDef<TRow>[],
  getRow: (rowId: string) => TRow | undefined,
  mode: FillMode,
): Filler<TRow> | undefined {
  const rowIndex = buildIndexMap(rowIds);
  const columnIndex = buildIndexMap(columnIds);
  const source = normalizeRange(sourceRange, rowIndex, columnIndex);
  const final = normalizeRange(finalRange, rowIndex, columnIndex);
  if (!source || !final) return undefined;

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

  function copyValue(r: number, c: number): FillValue<TRow> | typeof NO_VALUE {
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
    if (sourceRow === undefined || !sourceColumn) return NO_VALUE;
    return { value: getColumnValue(sourceColumn, sourceRow), source: { column: sourceColumn, row: sourceRow } };
  }

  // One entry per source line (a column for a vertical fill, a row for a
  // horizontal one): its numeric values in source order, or `undefined` if
  // any isn't a finite number — that line then falls back to copying.
  const seriesCache = new Map<string, number[] | undefined>();
  function numericLine(axis: "v" | "h", index: number): number[] | undefined {
    const key = `${axis}:${index}`;
    if (seriesCache.has(key)) return seriesCache.get(key);
    const values: number[] = [];
    let ok = true;
    const start = axis === "v" ? source!.rowStart : source!.colStart;
    const end = axis === "v" ? source!.rowEnd : source!.colEnd;
    for (let i = start; i <= end && ok; i++) {
      const rowId = rowIds[axis === "v" ? i : index];
      const columnId = columnIds[axis === "v" ? index : i];
      const row = rowId !== undefined ? getRow(rowId) : undefined;
      const column = columnId !== undefined ? columnById.get(columnId) : undefined;
      const value = row !== undefined && column && isNumericColumn(column) ? getColumnValue(column, row) : undefined;
      if (typeof value === "number" && Number.isFinite(value)) values.push(value);
      else ok = false;
    }
    const result = ok ? values : undefined;
    seriesCache.set(key, result);
    return result;
  }

  function seriesValue(r: number, c: number): number | undefined {
    const targetColumn = columnById.get(columnIds[c] ?? "");
    if (!targetColumn || !isNumericColumn(targetColumn)) return undefined;
    const isNewRow = r < source!.rowStart || r > source!.rowEnd;
    const axis = isNewRow ? "v" : "h";
    const values = numericLine(axis, isNewRow ? c : r);
    if (!values) return undefined;
    const first = values[0]!;
    const last = values[values.length - 1]!;
    const step = values.length > 1 ? (last - first) / (values.length - 1) : 1;
    const position = isNewRow ? r : c;
    const lineStart = isNewRow ? source!.rowStart : source!.colStart;
    const lineEnd = isNewRow ? source!.rowEnd : source!.colEnd;
    return tidy(position > lineEnd ? last + step * (position - lineEnd) : first - step * (lineStart - position));
  }

  function valueAt(r: number, c: number): FillValue<TRow> | typeof NO_VALUE {
    const isNewRow = r < source!.rowStart || r > source!.rowEnd;
    const isNewCol = c < source!.colStart || c > source!.colEnd;
    if (!isNewRow && !isNewCol) return NO_VALUE; // inside the original source rectangle — untouched by the fill
    if (mode === "series") {
      const series = seriesValue(r, c);
      if (series !== undefined) return { value: series, source: undefined };
    }
    return copyValue(r, c);
  }

  return { source, final, valueAt, columnById };
}

export interface FillOptions {
  /** Copy or continue a numeric series. Defaults to `"copy"`. */
  mode?: FillMode;
  /** Run each target column's `validateEdit` and skip failing cells. Defaults to true. */
  validate?: boolean;
}

export interface FillResult<TRow> {
  changes: CellChange<TRow>[];
  /** Cells the fill refused to write: not editable, a value that doesn't convert to the target column's type, or one its `validateEdit` rejects. */
  skipped: SkippedCell<TRow>[];
}

/**
 * Computes what a fill-handle drag does: every cell newly covered by
 * `finalRange` but not already inside `sourceRange` copies its value from the
 * corresponding source cell, TILING the source pattern across the fill
 * direction when the extension is longer than the source itself — the same
 * repeat-the-pattern behavior Excel's own fill-handle uses for a multi-cell
 * source (a single-cell source is just the degenerate case: every new cell
 * copies that one cell). With `mode: "series"`, a numeric source is instead
 * continued as a linear series (see `FillMode`).
 *
 * Each value is adapted to its target column (`adaptValueForColumn`): a
 * different column type converts like a paste would, and a value that
 * doesn't convert or fails `validateEdit` lands in `skipped` instead of
 * `changes`. Cells already inside `sourceRange` are left out entirely, as is
 * any target cell that no longer exists.
 */
export function computeFill<TRow>(
  sourceRange: CellRange,
  finalRange: CellRange,
  rowIds: string[],
  columnIds: string[],
  columns: ColumnDef<TRow>[],
  getRow: (rowId: string) => TRow | undefined,
  { mode = "copy", validate = true }: FillOptions = {},
): FillResult<TRow> {
  const result: FillResult<TRow> = { changes: [], skipped: [] };
  const filler = createFiller(sourceRange, finalRange, rowIds, columnIds, columns, getRow, mode);
  if (!filler) return result;
  const { final, valueAt, columnById } = filler;

  for (let r = final.rowStart; r <= final.rowEnd; r++) {
    for (let c = final.colStart; c <= final.colEnd; c++) {
      const filled = valueAt(r, c);
      if (filled === NO_VALUE) continue;

      const targetRowId = rowIds[r];
      const targetColumnId = columnIds[c];
      if (targetRowId === undefined || targetColumnId === undefined) continue;
      const column = columnById.get(targetColumnId);
      const targetRow = getRow(targetRowId);
      if (!column || targetRow === undefined) continue;
      if (!isEditable(column, targetRow)) {
        result.skipped.push({ rowId: targetRowId, columnId: targetColumnId, row: targetRow, reason: "not-editable", value: filled.value });
        continue;
      }

      const adapted = adaptValueForColumn(column, targetRow, filled.source, filled.value, validate);
      if (!("value" in adapted)) {
        result.skipped.push({
          rowId: targetRowId,
          columnId: targetColumnId,
          row: targetRow,
          reason: adapted.reason,
          message: adapted.message,
          value: filled.value,
        });
        continue;
      }
      result.changes.push({
        rowId: targetRowId,
        row: targetRow,
        columnId: targetColumnId,
        previousValue: getColumnValue(column, targetRow),
        value: adapted.value,
      });
    }
  }
  return result;
}

/** `computeFill`'s `changes` only — kept for callers that don't care about skipped cells. */
export function computeFillChanges<TRow>(
  sourceRange: CellRange,
  finalRange: CellRange,
  rowIds: string[],
  columnIds: string[],
  columns: ColumnDef<TRow>[],
  getRow: (rowId: string) => TRow | undefined,
  mode: FillMode = "copy",
): CellChange<TRow>[] {
  return computeFill(sourceRange, finalRange, rowIds, columnIds, columns, getRow, { mode }).changes;
}

/**
 * The value a fill would assign to the far-corner cell of `finalRange` (the
 * one under the cursor while dragging) — what Excel shows in its fill
 * tooltip. `undefined` if that cell isn't part of the extension or can't be
 * filled. Computes one cell, not the whole fill, so it's cheap enough to run
 * on every preview change.
 */
export function previewFillValue<TRow>(
  sourceRange: CellRange,
  finalRange: CellRange,
  rowIds: string[],
  columnIds: string[],
  columns: ColumnDef<TRow>[],
  getRow: (rowId: string) => TRow | undefined,
  { mode = "copy", validate = true }: FillOptions = {},
): { column: ColumnDef<TRow>; row: TRow; value: unknown } | undefined {
  const filler = createFiller(sourceRange, finalRange, rowIds, columnIds, columns, getRow, mode);
  if (!filler) return undefined;
  const { source, final, valueAt, columnById } = filler;
  // The corner furthest from the source on each axis it actually extended.
  const r = final.rowEnd > source.rowEnd ? final.rowEnd : final.rowStart;
  const c = final.colEnd > source.colEnd ? final.colEnd : final.colStart;
  const filled = valueAt(r, c);
  if (filled === NO_VALUE) return undefined;
  const rowId = rowIds[r];
  const columnId = columnIds[c];
  const row = rowId !== undefined ? getRow(rowId) : undefined;
  const column = columnId !== undefined ? columnById.get(columnId) : undefined;
  if (row === undefined || !column || !isEditable(column, row)) return undefined;
  const adapted = adaptValueForColumn(column, row, filled.source, filled.value, validate);
  return "value" in adapted ? { column, row, value: adapted.value } : undefined;
}

/** True if at least one source line of `sourceRange` is numeric, i.e. "Fill series" would differ from "Copy cells". */
export function canFillSeries<TRow>(
  sourceRange: CellRange,
  rowIds: string[],
  columnIds: string[],
  columns: ColumnDef<TRow>[],
  getRow: (rowId: string) => TRow | undefined,
): boolean {
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const source = normalizeRange(sourceRange, buildIndexMap(rowIds), buildIndexMap(columnIds));
  if (!source) return false;
  for (let c = source.colStart; c <= source.colEnd; c++) {
    const column = columnById.get(columnIds[c] ?? "");
    if (column && isNumericColumn(column)) {
      const row = getRow(rowIds[source.rowStart] ?? "");
      if (row !== undefined && typeof getColumnValue(column, row) === "number") return true;
    }
  }
  return false;
}
