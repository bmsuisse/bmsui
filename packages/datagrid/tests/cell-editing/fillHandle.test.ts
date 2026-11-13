import { describe, expect, it } from "vitest";
import { canFillSeries, computeFill, computeFillChanges, previewFillValue } from "../../src/cell-editing/fillHandle";
import type { ColumnDef } from "../../src/column/types";
import type { CellRange } from "../../src/cell-editing/types";

interface Row {
  id: string;
  a: string;
  b: string;
  locked: string;
}

const rows: Row[] = [
  { id: "r1", a: "A1", b: "B1", locked: "L1" },
  { id: "r2", a: "A2", b: "B2", locked: "L2" },
  { id: "r3", a: "A3", b: "B3", locked: "L3" },
  { id: "r4", a: "A4", b: "B4", locked: "L4" },
  { id: "r5", a: "A5", b: "B5", locked: "L5" },
];
const rowIds = rows.map((r) => r.id);
const rowById = new Map(rows.map((r) => [r.id, r]));
const getRow = (rowId: string): Row | undefined => rowById.get(rowId);

const columns: ColumnDef<Row>[] = [
  { id: "a", type: "string", header: "A", accessorKey: "a", editable: true },
  { id: "b", type: "string", header: "B", accessorKey: "b", editable: true },
  { id: "locked", type: "string", header: "Locked", accessorKey: "locked", editable: false },
];
const columnIds = columns.map((c) => c.id);

describe("computeFillChanges", () => {
  it("fills a single-cell source straight down, copying that one value to every new row", () => {
    const source: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } };
    const final: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r3", columnId: "a" } };
    const changes = computeFillChanges(source, final, rowIds, columnIds, columns, getRow);
    expect(changes).toEqual([
      { rowId: "r2", row: rows[1], columnId: "a", previousValue: "A2", value: "A1" },
      { rowId: "r3", row: rows[2], columnId: "a", previousValue: "A3", value: "A1" },
    ]);
  });

  it("does not include the original source cell(s) in the result", () => {
    const source: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } };
    const final: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "a" } };
    const changes = computeFillChanges(source, final, rowIds, columnIds, columns, getRow);
    expect(changes.find((c) => c.rowId === "r1")).toBeUndefined();
  });

  it("fills upward from a single-cell source the same way", () => {
    const source: CellRange = { anchor: { rowId: "r5", columnId: "a" }, focus: { rowId: "r5", columnId: "a" } };
    const final: CellRange = { anchor: { rowId: "r3", columnId: "a" }, focus: { rowId: "r5", columnId: "a" } };
    const changes = computeFillChanges(source, final, rowIds, columnIds, columns, getRow);
    expect(changes).toEqual([
      { rowId: "r3", row: rows[2], columnId: "a", previousValue: "A3", value: "A5" },
      { rowId: "r4", row: rows[3], columnId: "a", previousValue: "A4", value: "A5" },
    ]);
  });

  it("tiles a multi-row source's pattern when the fill extends beyond its own height", () => {
    // Source is rows r1-r2 (a 2-row pattern); fill down through r5 (3 new rows).
    const source: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "a" } };
    const final: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r5", columnId: "a" } };
    const changes = computeFillChanges(source, final, rowIds, columnIds, columns, getRow);
    // r3 repeats r1's value, r4 repeats r2's, r5 repeats r1's again.
    expect(changes).toEqual([
      { rowId: "r3", row: rows[2], columnId: "a", previousValue: "A3", value: "A1" },
      { rowId: "r4", row: rows[3], columnId: "a", previousValue: "A4", value: "A2" },
      { rowId: "r5", row: rows[4], columnId: "a", previousValue: "A5", value: "A1" },
    ]);
  });

  it("fills horizontally, reading each new column's value from the correspondingly-tiled SOURCE column, not the target column's own", () => {
    const source: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } };
    const final: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "b" } };
    const changes = computeFillChanges(source, final, rowIds, columnIds, columns, getRow);
    expect(changes).toEqual([{ rowId: "r1", row: rows[0], columnId: "b", previousValue: "B1", value: "A1" }]);
  });

  it("fills a multi-cell (row+column) source, tiling both axes independently when extended in one direction", () => {
    // Source is the 2x2 block (r1..r2, a..b); fill down through r4 (rows only extend).
    const source: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "b" } };
    const final: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r4", columnId: "b" } };
    const changes = computeFillChanges(source, final, rowIds, columnIds, columns, getRow);
    expect(changes).toEqual([
      { rowId: "r3", row: rows[2], columnId: "a", previousValue: "A3", value: "A1" },
      { rowId: "r3", row: rows[2], columnId: "b", previousValue: "B3", value: "B1" },
      { rowId: "r4", row: rows[3], columnId: "a", previousValue: "A4", value: "A2" },
      { rowId: "r4", row: rows[3], columnId: "b", previousValue: "B4", value: "B2" },
    ]);
  });

  it("skips a newly-covered cell whose column is not editable", () => {
    const source: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "locked" } };
    const final: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "locked" } };
    const changes = computeFillChanges(source, final, rowIds, columnIds, columns, getRow);
    expect(changes.some((c) => c.columnId === "locked")).toBe(false);
    expect(changes).toEqual([
      { rowId: "r2", row: rows[1], columnId: "a", previousValue: "A2", value: "A1" },
      { rowId: "r2", row: rows[1], columnId: "b", previousValue: "B2", value: "B1" },
    ]);
  });

  it("returns an empty array when either range can't be resolved", () => {
    const source: CellRange = { anchor: { rowId: "gone", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } };
    const final: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "a" } };
    expect(computeFillChanges(source, final, rowIds, columnIds, columns, getRow)).toEqual([]);
  });

  it("returns an empty array when the fill didn't actually extend beyond the source (final === source)", () => {
    const range: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } };
    expect(computeFillChanges(range, range, rowIds, columnIds, columns, getRow)).toEqual([]);
  });
});

describe("fill series", () => {
  interface NumRow {
    id: string;
    n: number;
    label: string;
  }
  const numRows: NumRow[] = [
    { id: "r1", n: 2, label: "x" },
    { id: "r2", n: 4, label: "y" },
    { id: "r3", n: 0, label: "z" },
    { id: "r4", n: 0, label: "z" },
    { id: "r5", n: 0, label: "z" },
  ];
  const numRowIds = numRows.map((r) => r.id);
  const numById = new Map(numRows.map((r) => [r.id, r]));
  const getNum = (id: string): NumRow | undefined => numById.get(id);
  const numColumns: ColumnDef<NumRow>[] = [
    { id: "n", type: "number", header: "N", accessorKey: "n", editable: true },
    { id: "label", type: "string", header: "L", accessorKey: "label", editable: true },
  ];
  const numColumnIds = numColumns.map((c) => c.id);
  const range = (r1: string, c1: string, r2: string, c2: string): CellRange => ({
    anchor: { rowId: r1, columnId: c1 },
    focus: { rowId: r2, columnId: c2 },
  });

  it("continues a single number by 1 per row", () => {
    const changes = computeFillChanges(range("r1", "n", "r1", "n"), range("r1", "n", "r3", "n"), numRowIds, numColumnIds, numColumns, getNum, "series");
    expect(changes.map((c) => c.value)).toEqual([3, 4]);
  });

  it("continues a multi-cell numeric source by its own step", () => {
    const changes = computeFillChanges(range("r1", "n", "r2", "n"), range("r1", "n", "r4", "n"), numRowIds, numColumnIds, numColumns, getNum, "series");
    expect(changes.map((c) => c.value)).toEqual([6, 8]);
  });

  it("extends upward with a negative direction", () => {
    const changes = computeFillChanges(range("r2", "n", "r2", "n"), range("r1", "n", "r2", "n"), numRowIds, numColumnIds, numColumns, getNum, "series");
    expect(changes.map((c) => c.value)).toEqual([3]);
  });

  it("falls back to copying for a non-numeric column", () => {
    const changes = computeFillChanges(range("r1", "label", "r1", "label"), range("r1", "label", "r2", "label"), numRowIds, numColumnIds, numColumns, getNum, "series");
    expect(changes.map((c) => c.value)).toEqual(["x"]);
  });

  it("previewFillValue reports the value under the cursor", () => {
    const preview = previewFillValue(range("r1", "n", "r2", "n"), range("r1", "n", "r5", "n"), numRowIds, numColumnIds, numColumns, getNum, { mode: "series" });
    expect(preview?.value).toBe(10);
    expect(previewFillValue(range("r1", "n", "r1", "n"), range("r1", "n", "r1", "n"), numRowIds, numColumnIds, numColumns, getNum)).toBeUndefined();
  });

  it("canFillSeries is true only for a numeric source", () => {
    expect(canFillSeries(range("r1", "n", "r1", "n"), numRowIds, numColumnIds, numColumns, getNum)).toBe(true);
    expect(canFillSeries(range("r1", "label", "r1", "label"), numRowIds, numColumnIds, numColumns, getNum)).toBe(false);
  });
});

describe("fill across different column types and validations", () => {
  interface Mixed {
    id: string;
    name: string;
    qty: number;
    owner: string;
    note: string;
  }
  const data: Mixed[] = [
    { id: "r1", name: "42", qty: 1, owner: "alice", note: "" },
    { id: "r2", name: "x", qty: 2, owner: "bob", note: "" },
  ];
  const byId = new Map(data.map((r) => [r.id, r]));
  const get = (id: string): Mixed | undefined => byId.get(id);
  const cols: ColumnDef<Mixed>[] = [
    { id: "name", type: "string", header: "Name", accessorKey: "name", editable: true },
    { id: "qty", type: "number", header: "Qty", accessorKey: "qty", editable: true, validateEdit: (v) => (typeof v === "number" && v < 0 ? "Must be >= 0" : undefined) },
    {
      id: "owner",
      type: "enum",
      header: "Owner",
      accessorKey: "owner",
      editable: true,
      options: [
        { value: "alice", label: "Alice" },
        { value: "bob", label: "Bob" },
      ],
    },
    { id: "note", type: "string", header: "Note", accessorKey: "note", editable: true, validateEdit: (v) => (v === "" ? "Required" : undefined) },
  ];
  const ids = cols.map((c) => c.id);
  const rids = data.map((r) => r.id);
  const r = (r1: string, c1: string, r2: string, c2: string): CellRange => ({ anchor: { rowId: r1, columnId: c1 }, focus: { rowId: r2, columnId: c2 } });

  it("converts a string into a number column like a paste would", () => {
    const { changes, skipped } = computeFill(r("r1", "name", "r1", "name"), r("r1", "name", "r1", "qty"), rids, ids, cols, get);
    expect(changes).toEqual([{ rowId: "r1", row: data[0], columnId: "qty", previousValue: 1, value: 42 }]);
    expect(skipped).toEqual([]);
  });

  it("skips a value that doesn't convert to the target type instead of writing garbage", () => {
    const { changes, skipped } = computeFill(r("r2", "name", "r2", "name"), r("r2", "name", "r2", "qty"), rids, ids, cols, get);
    expect(changes).toEqual([]);
    expect(skipped).toMatchObject([{ rowId: "r2", columnId: "qty", reason: "incompatible-type" }]);
  });

  it("skips an enum value the target enum doesn't have, and matches by label across types", () => {
    const toEnum = computeFill(r("r2", "name", "r2", "name"), r("r2", "name", "r2", "owner"), rids, ids, cols, get);
    expect(toEnum.skipped.find((cell) => cell.columnId === "owner")).toMatchObject({ reason: "incompatible-type" });
    const labelled: Mixed[] = [{ id: "r1", name: "Bob", qty: 0, owner: "alice", note: "n" }];
    const byLabel = new Map(labelled.map((x) => [x.id, x]));
    const matched = computeFill(r("r1", "name", "r1", "name"), r("r1", "name", "r1", "owner"), ["r1"], ids, cols, (id) => byLabel.get(id));
    expect(matched.changes.map((c) => c.value)).toEqual(["bob"]);
  });

  it("applies the target column's validateEdit and reports the message", () => {
    const { changes, skipped } = computeFill(r("r1", "note", "r1", "note"), r("r1", "note", "r2", "note"), rids, ids, cols, get);
    expect(changes).toEqual([]);
    expect(skipped).toMatchObject([{ rowId: "r2", columnId: "note", reason: "validation", message: "Required" }]);
  });

  it("validate: false writes the value despite validateEdit", () => {
    const { changes } = computeFill(r("r1", "note", "r1", "note"), r("r1", "note", "r2", "note"), rids, ids, cols, get, { validate: false });
    expect(changes).toHaveLength(1);
  });

  it("series fill leaves a non-numeric target in a horizontal fill to a plain copy", () => {
    const { changes } = computeFill(r("r1", "qty", "r1", "qty"), r("r1", "qty", "r1", "owner"), rids, ids, cols, get, { mode: "series" });
    // "1" doesn't match an enum option, so it's skipped rather than series-filled.
    expect(changes).toEqual([]);
  });
});
