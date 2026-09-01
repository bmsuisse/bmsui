import { describe, expect, it } from "vitest";
import { parseTsv, rangeToTsv } from "../../src/cell-editing/clipboard";
import type { ColumnDef } from "../../src/column/types";
import type { CellRange } from "../../src/cell-editing/types";

interface Row {
  id: string;
  name: string;
  status: string;
}

const rows: Row[] = [
  { id: "r1", name: "Charlie", status: "pending" },
  { id: "r2", name: "Alice", status: "shipped" },
  { id: "r3", name: "Multi\nLine", status: "pending" },
];
const rowIds = ["r1", "r2", "r3"];

const columns: ColumnDef<Row>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
  {
    id: "status",
    type: "enum",
    header: "Status",
    accessorKey: "status",
    options: [
      { value: "pending", label: "Pending" },
      { value: "shipped", label: "Shipped" },
    ],
  },
];
const columnIds = ["name", "status"];
const getRowId = (row: Row): string => row.id;

describe("rangeToTsv", () => {
  it("serializes a multi-row, multi-column range as tab-separated columns / newline-separated rows, using display formatting (enum labels, not raw values)", () => {
    const range: CellRange = { anchor: { rowId: "r1", columnId: "name" }, focus: { rowId: "r2", columnId: "status" } };
    expect(rangeToTsv(range, rows, rowIds, columns, columnIds, getRowId)).toBe("Charlie\tPending\nAlice\tShipped");
  });

  it("serializes a single-cell range as one field, no delimiters", () => {
    const range: CellRange = { anchor: { rowId: "r2", columnId: "name" }, focus: { rowId: "r2", columnId: "name" } };
    expect(rangeToTsv(range, rows, rowIds, columns, columnIds, getRowId)).toBe("Alice");
  });

  it("quotes a field containing a newline, doubling any internal quotes", () => {
    const range: CellRange = { anchor: { rowId: "r3", columnId: "name" }, focus: { rowId: "r3", columnId: "name" } };
    expect(rangeToTsv(range, rows, rowIds, columns, columnIds, getRowId)).toBe('"Multi\nLine"');
  });

  it("prefers formatForClipboard over defaultFormat when a column supplies one", () => {
    const customColumns: ColumnDef<Row>[] = [{ ...columns[0]!, formatForClipboard: (value) => `NAME:${String(value)}` }, columns[1]!];
    const range: CellRange = { anchor: { rowId: "r1", columnId: "name" }, focus: { rowId: "r1", columnId: "name" } };
    expect(rangeToTsv(range, rows, rowIds, customColumns, columnIds, getRowId)).toBe("NAME:Charlie");
  });

  it("returns an empty string when the range can't be resolved", () => {
    const range: CellRange = { anchor: { rowId: "gone", columnId: "name" }, focus: { rowId: "r1", columnId: "name" } };
    expect(rangeToTsv(range, rows, rowIds, columns, columnIds, getRowId)).toBe("");
  });
});

describe("parseTsv", () => {
  it("parses a simple multi-row, multi-column block", () => {
    expect(parseTsv("Charlie\tPending\nAlice\tShipped")).toEqual([
      ["Charlie", "Pending"],
      ["Alice", "Shipped"],
    ]);
  });

  it("parses a single value with no delimiters as a 1x1 block", () => {
    expect(parseTsv("Alice")).toEqual([["Alice"]]);
  });

  it("treats CRLF line endings the same as bare newlines", () => {
    expect(parseTsv("A\tB\r\nC\tD")).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
  });

  it("drops a single bogus trailing empty row caused by a trailing newline", () => {
    expect(parseTsv("Charlie\tPending\n")).toEqual([["Charlie", "Pending"]]);
  });

  it("keeps a genuinely blank last row when there are two trailing newlines", () => {
    expect(parseTsv("Charlie\n\n")).toEqual([["Charlie"], [""]]);
  });

  it("un-escapes a quoted field back to its original text, including an embedded newline and doubled quotes", () => {
    expect(parseTsv('"Multi\nLine"\tPending')).toEqual([["Multi\nLine", "Pending"]]);
    expect(parseTsv('"Say ""hi"""')).toEqual([['Say "hi"']]);
  });

  it("round-trips through rangeToTsv/parseTsv for a value containing a newline", () => {
    const range: CellRange = { anchor: { rowId: "r3", columnId: "name" }, focus: { rowId: "r3", columnId: "name" } };
    const serialized = rangeToTsv(range, rows, rowIds, columns, columnIds, getRowId);
    expect(parseTsv(serialized)).toEqual([["Multi\nLine"]]);
  });

  it("strips a leading byte-order mark instead of folding it into the first cell", () => {
    expect(parseTsv("﻿Charlie\tPending")).toEqual([["Charlie", "Pending"]]);
  });
});
