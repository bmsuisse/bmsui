import { describe, expect, it } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import {
  canHideColumn,
  canHideGroup,
  countVisible,
  groupColumns,
  isColumnVisible,
} from "../../src/column-selector/visibility";

interface Row {
  a: string;
  b: string;
  c: string;
}

const columns: ColumnDef<Row>[] = [
  { id: "a", type: "string", header: "A" },
  { id: "b", type: "string", header: "B", group: "Details" },
  { id: "c", type: "string", header: "C", group: "Details" },
];

describe("isColumnVisible", () => {
  it("is visible when the key is missing (matches TanStack's convention)", () => {
    expect(isColumnVisible({}, "a")).toBe(true);
  });

  it("is visible when explicitly true, hidden when explicitly false", () => {
    expect(isColumnVisible({ a: true }, "a")).toBe(true);
    expect(isColumnVisible({ a: false }, "a")).toBe(false);
  });
});

describe("countVisible", () => {
  it("counts every column as visible with an empty visibility map", () => {
    expect(countVisible(columns, {})).toBe(3);
  });

  it("excludes hidden columns", () => {
    expect(countVisible(columns, { b: false })).toBe(2);
  });
});

describe("groupColumns", () => {
  it("puts ungrouped columns first, in their own section", () => {
    const groups = groupColumns(columns);
    expect(groups[0]?.group).toBeUndefined();
    expect(groups[0]?.columns.map((c) => c.id)).toEqual(["a"]);
  });

  it("groups columns sharing the same group label together, in order", () => {
    const groups = groupColumns(columns);
    const details = groups.find((g) => g.group === "Details");
    expect(details?.columns.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("omits the ungrouped section entirely when every column has a group", () => {
    const allGrouped: ColumnDef<Row>[] = columns.map((c) => ({ ...c, group: c.group ?? "Misc" }));
    const groups = groupColumns(allGrouped);
    expect(groups.every((g) => g.group !== undefined)).toBe(true);
  });
});

describe("canHideColumn", () => {
  it("allows hiding a visible column when others remain visible", () => {
    expect(canHideColumn(columns, {}, "a")).toBe(true);
  });

  it("blocks hiding the last visible column", () => {
    const visibility = { b: false, c: false };
    expect(canHideColumn(columns, visibility, "a")).toBe(false);
  });

  it("allows 'hiding' an already-hidden column (no-op)", () => {
    expect(canHideColumn(columns, { a: false }, "a")).toBe(true);
  });
});

describe("canHideGroup", () => {
  it("allows hiding a group when columns outside it remain visible", () => {
    expect(canHideGroup(columns, {}, ["b", "c"])).toBe(true);
  });

  it("blocks hiding a group that would leave zero columns visible overall", () => {
    const visibility = { a: false };
    expect(canHideGroup(columns, visibility, ["b", "c"])).toBe(false);
  });
});
