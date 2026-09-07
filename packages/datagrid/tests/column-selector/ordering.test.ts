import { describe, expect, it } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import { applyColumnOrder, moveColumnBefore } from "../../src/column-selector/ordering";

interface Row {
  id: string;
  name: string;
  email: string;
}

const columns: ColumnDef<Row>[] = [
  { id: "id", type: "string", header: "ID" },
  { id: "name", type: "string", header: "Name" },
  { id: "email", type: "string", header: "Email" },
];

describe("applyColumnOrder", () => {
  it("reorders columns to match the given id order", () => {
    const reordered = applyColumnOrder(columns, ["email", "id", "name"]);
    expect(reordered.map((c) => c.id)).toEqual(["email", "id", "name"]);
  });

  it("appends a column missing from `order` at the end, in its original position", () => {
    const reordered = applyColumnOrder(columns, ["email", "id"]);
    expect(reordered.map((c) => c.id)).toEqual(["email", "id", "name"]);
  });

  it("ignores an id in `order` that no longer matches a real column", () => {
    const reordered = applyColumnOrder(columns, ["ghost", "email", "id", "name"]);
    expect(reordered.map((c) => c.id)).toEqual(["email", "id", "name"]);
  });

  it("ignores a duplicate id in `order`, using only its first occurrence", () => {
    const reordered = applyColumnOrder(columns, ["name", "name", "id", "email"]);
    expect(reordered.map((c) => c.id)).toEqual(["name", "id", "email"]);
  });
});

describe("moveColumnBefore", () => {
  const order = ["id", "name", "email"];

  it("moves a column earlier in the list", () => {
    expect(moveColumnBefore(order, "email", "id")).toEqual(["email", "id", "name"]);
  });

  it("moves a column later in the list", () => {
    expect(moveColumnBefore(order, "id", "email")).toEqual(["name", "id", "email"]);
  });

  it("moves a column to the end when beforeColumnId is undefined", () => {
    expect(moveColumnBefore(order, "id", undefined)).toEqual(["name", "email", "id"]);
  });

  it("moves a column to the end when beforeColumnId no longer exists", () => {
    expect(moveColumnBefore(order, "id", "ghost")).toEqual(["name", "email", "id"]);
  });

  it("falls back to moving to the end when columnId and beforeColumnId are the same", () => {
    // Not a case ColumnSelector's own drag handler ever passes through in
    // practice (its handleDrop bails out before calling this when
    // draggedId === targetId) -- documented here so the fallback behavior
    // for this edge case stays deliberate rather than accidental: removing
    // `columnId` from `order` also removes the (identical) `beforeColumnId`,
    // so `indexOf` can't find it and this falls back to "move to the end",
    // same as any other missing `beforeColumnId`.
    expect(moveColumnBefore(order, "name", "name")).toEqual(["id", "email", "name"]);
  });
});
