import { describe, expect, it } from "vitest";
import { getColumnValue, isFilterable, isSortable } from "../../src/column/types";
import type { ColumnDef } from "../../src/column/types";

interface Row {
  id: string;
  name: string;
}

describe("getColumnValue", () => {
  const row: Row = { id: "1", name: "Acme" };

  it("reads via accessorKey", () => {
    const col: ColumnDef<Row> = { id: "name", type: "string", header: "Name", accessorKey: "name" };
    expect(getColumnValue(col, row)).toBe("Acme");
  });

  it("prefers accessorFn over accessorKey", () => {
    const col: ColumnDef<Row> = {
      id: "name",
      type: "string",
      header: "Name",
      accessorKey: "name",
      accessorFn: (r) => r.name.toUpperCase(),
    };
    expect(getColumnValue(col, row)).toBe("ACME");
  });

  it("returns undefined when neither accessor is set", () => {
    const col: ColumnDef<Row> = { id: "name", type: "string", header: "Name" };
    expect(getColumnValue(col, row)).toBeUndefined();
  });
});

describe("isSortable / isFilterable", () => {
  it("default to false when unset (opt-in, not opt-out)", () => {
    const col: ColumnDef<Row> = { id: "name", type: "string", header: "Name" };
    expect(isSortable(col)).toBe(false);
    expect(isFilterable(col)).toBe(false);
  });

  it("honor explicit true", () => {
    const col: ColumnDef<Row> = {
      id: "name",
      type: "string",
      header: "Name",
      sortable: true,
      filterable: true,
    };
    expect(isSortable(col)).toBe(true);
    expect(isFilterable(col)).toBe(true);
  });

  it("explicit false is equivalent to omitting it", () => {
    const col: ColumnDef<Row> = {
      id: "name",
      type: "string",
      header: "Name",
      sortable: false,
      filterable: false,
    };
    expect(isSortable(col)).toBe(false);
    expect(isFilterable(col)).toBe(false);
  });
});
