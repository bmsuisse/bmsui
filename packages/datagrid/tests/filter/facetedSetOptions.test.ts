import { describe, expect, it } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import { facetedSetOptions } from "../../src/filter/facetedValues";
import type { CompositeFilterDescriptor } from "../../src/filter/types";

interface Row {
  id: string;
  region: string | null;
  status: string;
}

const rows: Row[] = [
  { id: "1", region: "EMEA", status: "open" },
  { id: "2", region: "EMEA", status: "closed" },
  { id: "3", region: "APAC", status: "open" },
  { id: "4", region: null, status: "open" },
];

const region: ColumnDef<Row> = { id: "region", type: "string", header: "Region", accessorKey: "region" };
const status: ColumnDef<Row> = {
  id: "status",
  type: "enum",
  header: "Status",
  accessorKey: "status",
  options: [
    { value: "open", label: "Open" },
    { value: "pending", label: "Pending" },
    { value: "closed", label: "Closed" },
  ],
};

describe("facetedSetOptions", () => {
  it("counts distinct values, skips nulls and sorts by label", () => {
    expect(facetedSetOptions(rows, region, null)).toEqual([
      { value: "APAC", label: "APAC", count: 1 },
      { value: "EMEA", label: "EMEA", count: 2 },
    ]);
  });

  it("ignores the column's own filter but applies every other one", () => {
    const filter: CompositeFilterDescriptor = {
      logic: "and",
      filters: [
        { field: "region", operator: "in", value: ["APAC"] },
        { field: "status", operator: "eq", value: "open" },
      ],
    };
    expect(facetedSetOptions(rows, region, filter)).toEqual([
      { value: "APAC", label: "APAC", count: 1 },
      { value: "EMEA", label: "EMEA", count: 1 },
    ]);
  });

  it("keeps a selected value no row carries any more, with count 0", () => {
    const filter: CompositeFilterDescriptor = {
      logic: "and",
      filters: [{ field: "region", operator: "notIn", value: ["LATAM"] }],
    };
    expect(facetedSetOptions(rows, region, filter)).toContainEqual({ value: "LATAM", label: "LATAM", count: 0 });
  });

  it("keeps an enum column's option order and labels", () => {
    expect(facetedSetOptions(rows, status, null)).toEqual([
      { value: "open", label: "Open", count: 3 },
      { value: "closed", label: "Closed", count: 1 },
    ]);
  });
});
