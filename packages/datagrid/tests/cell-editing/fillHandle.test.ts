import { describe, expect, it } from "vitest";
import { computeFillChanges } from "../../src/cell-editing/fillHandle";
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
