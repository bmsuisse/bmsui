import { describe, expect, it } from "vitest";
import {
  buildIndexMap,
  cellsInRange,
  extendRangeForFill,
  isCellInRange,
  normalizeRange,
} from "../../src/cell-editing/rangeUtils";
import type { CellRange } from "../../src/cell-editing/types";

const rowIds = ["r1", "r2", "r3", "r4"];
const columnIds = ["a", "b", "c"];
const rowIndex = buildIndexMap(rowIds);
const columnIndex = buildIndexMap(columnIds);

describe("normalizeRange", () => {
  it("resolves a forward range (anchor before focus) to ordinal start/end", () => {
    const range: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r3", columnId: "b" } };
    expect(normalizeRange(range, rowIndex, columnIndex)).toEqual({ rowStart: 0, rowEnd: 2, colStart: 0, colEnd: 1 });
  });

  it("resolves a reversed range (focus before anchor) the same way — order doesn't matter", () => {
    const range: CellRange = { anchor: { rowId: "r3", columnId: "b" }, focus: { rowId: "r1", columnId: "a" } };
    expect(normalizeRange(range, rowIndex, columnIndex)).toEqual({ rowStart: 0, rowEnd: 2, colStart: 0, colEnd: 1 });
  });

  it("collapses to a single cell when anchor equals focus", () => {
    const range: CellRange = { anchor: { rowId: "r2", columnId: "b" }, focus: { rowId: "r2", columnId: "b" } };
    expect(normalizeRange(range, rowIndex, columnIndex)).toEqual({ rowStart: 1, rowEnd: 1, colStart: 1, colEnd: 1 });
  });

  it("returns undefined when a row id no longer exists (e.g. the row was removed from data)", () => {
    const range: CellRange = { anchor: { rowId: "gone", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } };
    expect(normalizeRange(range, rowIndex, columnIndex)).toBeUndefined();
  });

  it("returns undefined when a column id no longer exists", () => {
    const range: CellRange = { anchor: { rowId: "r1", columnId: "gone" }, focus: { rowId: "r1", columnId: "a" } };
    expect(normalizeRange(range, rowIndex, columnIndex)).toBeUndefined();
  });
});

describe("isCellInRange", () => {
  const range: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r3", columnId: "b" } };

  it("is true for a cell strictly inside the range", () => {
    expect(isCellInRange({ rowId: "r2", columnId: "a" }, range, rowIndex, columnIndex)).toBe(true);
  });

  it("is true for a cell on the range's border", () => {
    expect(isCellInRange({ rowId: "r1", columnId: "a" }, range, rowIndex, columnIndex)).toBe(true);
    expect(isCellInRange({ rowId: "r3", columnId: "b" }, range, rowIndex, columnIndex)).toBe(true);
  });

  it("is false for a cell outside the range", () => {
    expect(isCellInRange({ rowId: "r4", columnId: "a" }, range, rowIndex, columnIndex)).toBe(false);
    expect(isCellInRange({ rowId: "r1", columnId: "c" }, range, rowIndex, columnIndex)).toBe(false);
  });
});

describe("cellsInRange", () => {
  it("enumerates every cell in row-major order for a multi-row, multi-column range", () => {
    const range: CellRange = { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r2", columnId: "b" } };
    expect(cellsInRange(range, rowIds, columnIds, rowIndex, columnIndex)).toEqual([
      { rowId: "r1", columnId: "a" },
      { rowId: "r1", columnId: "b" },
      { rowId: "r2", columnId: "a" },
      { rowId: "r2", columnId: "b" },
    ]);
  });

  it("returns a single-element array for a one-cell range", () => {
    const range: CellRange = { anchor: { rowId: "r2", columnId: "b" }, focus: { rowId: "r2", columnId: "b" } };
    expect(cellsInRange(range, rowIds, columnIds, rowIndex, columnIndex)).toEqual([{ rowId: "r2", columnId: "b" }]);
  });

  it("returns an empty array when the range can't be resolved", () => {
    const range: CellRange = { anchor: { rowId: "gone", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } };
    expect(cellsInRange(range, rowIds, columnIds, rowIndex, columnIndex)).toEqual([]);
  });
});

describe("extendRangeForFill", () => {
  const base = normalizeRange(
    { anchor: { rowId: "r1", columnId: "a" }, focus: { rowId: "r1", columnId: "a" } },
    rowIndex,
    columnIndex,
  )!;

  it("returns the base range unchanged when the target is inside it", () => {
    expect(extendRangeForFill(base, { row: 0, col: 0 })).toEqual(base);
  });

  it("extends straight down when the target is below the base range", () => {
    expect(extendRangeForFill(base, { row: 3, col: 0 })).toEqual({ rowStart: 0, rowEnd: 3, colStart: 0, colEnd: 0 });
  });

  it("extends straight right when the target is to the right of the base range", () => {
    expect(extendRangeForFill(base, { row: 0, col: 2 })).toEqual({ rowStart: 0, rowEnd: 0, colStart: 0, colEnd: 2 });
  });

  it("locks to the axis with the larger overshoot, never extending diagonally", () => {
    // 3 rows of overshoot vs. 1 column of overshoot -> row wins, column stays put.
    expect(extendRangeForFill(base, { row: 3, col: 1 })).toEqual({ rowStart: 0, rowEnd: 3, colStart: 0, colEnd: 0 });
    // 1 row of overshoot vs. 2 columns of overshoot -> column wins, row stays put.
    expect(extendRangeForFill(base, { row: 1, col: 2 })).toEqual({ rowStart: 0, rowEnd: 0, colStart: 0, colEnd: 2 });
  });

  it("extends upward/leftward past the base's leading edge the same way", () => {
    const midBase = normalizeRange(
      { anchor: { rowId: "r2", columnId: "b" }, focus: { rowId: "r2", columnId: "b" } },
      rowIndex,
      columnIndex,
    )!;
    expect(extendRangeForFill(midBase, { row: 0, col: 1 })).toEqual({ rowStart: 0, rowEnd: 1, colStart: 1, colEnd: 1 });
  });
});
