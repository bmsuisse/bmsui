import { defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { getColumnValue } from "../column/types";
import { buildIndexMap, normalizeRange } from "./rangeUtils";
import type { CellRange } from "./types";

/** Wraps `field` in double quotes (doubling any internal quotes) only if it contains a tab, newline, or quote — the same quoting convention real spreadsheet apps (Excel, Google Sheets) use for their own TSV clipboard payloads, so a value round-trips correctly through copy/paste with them. */
function quoteTsvField(field: string): string {
  if (!/[\t\n\r"]/.test(field)) return field;
  return `"${field.replace(/"/g, '""')}"`;
}

/**
 * Serializes the cells inside `range` to Excel-compatible TSV text: tab-
 * separated columns, newline-separated rows, walking `rowIds`/`columnIds` in
 * their on-screen order (not `range`'s own anchor/focus order). Each cell's
 * text comes from `column.formatForClipboard` if the column supplies one,
 * else the same `defaultFormat` display text the grid itself renders —
 * deliberately not a second "raw value to string" path.
 */
export function rangeToTsv<TRow>(
  range: CellRange,
  rows: TRow[],
  rowIds: string[],
  columns: ColumnDef<TRow>[],
  columnIds: string[],
  getRowId: (row: TRow) => string,
): string {
  const rowIndex = buildIndexMap(rowIds);
  const columnIndex = buildIndexMap(columnIds);
  const normalized = normalizeRange(range, rowIndex, columnIndex);
  if (!normalized) return "";

  const columnById = new Map(columns.map((column) => [column.id, column]));
  const rowById = new Map(rows.map((row) => [getRowId(row), row]));

  const lines: string[] = [];
  for (let r = normalized.rowStart; r <= normalized.rowEnd; r++) {
    const rowId = rowIds[r];
    const row = rowId !== undefined ? rowById.get(rowId) : undefined;
    const fields: string[] = [];
    for (let c = normalized.colStart; c <= normalized.colEnd; c++) {
      const columnId = columnIds[c];
      const column = columnId !== undefined ? columnById.get(columnId) : undefined;
      if (!column || row === undefined) {
        fields.push("");
        continue;
      }
      const value = getColumnValue(column, row);
      const text = column.formatForClipboard ? column.formatForClipboard(value, row) : defaultFormat(column, value);
      fields.push(quoteTsvField(text));
    }
    lines.push(fields.join("\t"));
  }
  return lines.join("\n");
}

/**
 * Parses Excel-compatible TSV/tab-delimited clipboard text into a 2D array
 * of raw string cells. A small character-by-character state machine (not a
 * naive split-by-newline-then-split-by-tab) so a quoted field's own embedded
 * newline — a genuine multi-line cell copied from Excel/Sheets — isn't
 * mistaken for a row boundary, and a doubled `""` inside a quoted field
 * unescapes to one literal `"`.
 */
export function parseTsv(text: string): string[][] {
  // A leading byte-order mark shows up on some Windows clipboard sources
  // (and would otherwise become part of the very first cell's own text).
  const withoutBom = text.startsWith("﻿") ? text.slice(1) : text;
  const normalized = withoutBom.replace(/\r\n/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < normalized.length) {
    const ch = normalized[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === "\t") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  row.push(field);
  rows.push(row);

  // A trailing newline (common when copying a full range from Excel/Sheets)
  // would otherwise parse as one extra, bogus all-empty trailing row.
  const last = rows[rows.length - 1];
  if (rows.length > 1 && normalized.endsWith("\n") && last?.length === 1 && last[0] === "") {
    rows.pop();
  }
  return rows;
}
