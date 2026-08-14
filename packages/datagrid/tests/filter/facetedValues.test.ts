import { describe, expect, it } from "vitest";
import { facetedNumberValues } from "../../src/filter/facetedValues";
import type { ColumnDef } from "../../src/column/types";
import type { CompositeFilterDescriptor } from "../../src/filter/types";

interface Row {
  id: string;
  sales: number;
  margin: number;
}

const rows: Row[] = [
  { id: "a", sales: 100, margin: 10 },
  { id: "b", sales: 200, margin: 20 },
  { id: "c", sales: 300, margin: 30 },
  { id: "d", sales: 400, margin: 40 },
];

const salesColumn: ColumnDef<Row> = { id: "sales", type: "number", header: "Sales", accessorKey: "sales" };
const marginColumn: ColumnDef<Row> = { id: "margin", type: "number", header: "Margin", accessorKey: "margin" };

describe("facetedNumberValues", () => {
  it("returns every row's value for the column when there is no filter at all", () => {
    expect(facetedNumberValues(rows, salesColumn, null)).toEqual([100, 200, 300, 400]);
  });

  it("excludes the column's OWN active filter -- the core bug fix", () => {
    // Sales is filtered to [100, 200], but its own histogram/domain must
    // still see the full [100, 400] range, not shrink to [100, 200].
    const filter: CompositeFilterDescriptor = {
      logic: "and",
      filters: [{ field: "sales", operator: "between", value: [100, 200] }],
    };
    expect(facetedNumberValues(rows, salesColumn, filter)).toEqual([100, 200, 300, 400]);
  });

  it("still respects every OTHER active filter", () => {
    // Margin filtered to >= 30 (rows c, d) should narrow sales' facet to those rows'
    // sales values, even though sales itself has no filter of its own.
    const filter: CompositeFilterDescriptor = {
      logic: "and",
      filters: [{ field: "margin", operator: "gte", value: 30 }],
    };
    expect(facetedNumberValues(rows, salesColumn, filter)).toEqual([300, 400]);
  });

  it("combines: excludes its own filter but keeps every other filter's effect", () => {
    const filter: CompositeFilterDescriptor = {
      logic: "and",
      filters: [
        { field: "sales", operator: "lte", value: 200 }, // sales' own -- excluded
        { field: "margin", operator: "gte", value: 20 }, // kept -- excludes row a
      ],
    };
    expect(facetedNumberValues(rows, salesColumn, filter)).toEqual([200, 300, 400]);
  });

  it("with two simultaneously active filters, each column's facet respects the OTHER's filter but never its own", () => {
    const filter: CompositeFilterDescriptor = {
      logic: "and",
      filters: [
        { field: "sales", operator: "between", value: [100, 200] }, // rows a, b
        { field: "margin", operator: "gte", value: 20 }, // rows b, c, d
      ],
    };
    // Sales' own facet excludes sales' filter, keeps margin's -> rows b, c, d's sales.
    expect(facetedNumberValues(rows, salesColumn, filter)).toEqual([200, 300, 400]);
    // Margin's own facet excludes margin's filter, keeps sales' -> rows a, b's margin.
    expect(facetedNumberValues(rows, marginColumn, filter)).toEqual([10, 20]);
  });

  it("returns an empty array when every OTHER filter excludes all rows", () => {
    const filter: CompositeFilterDescriptor = {
      logic: "and",
      filters: [{ field: "margin", operator: "gt", value: 1000 }],
    };
    expect(facetedNumberValues(rows, salesColumn, filter)).toEqual([]);
  });

  it("treats a bare (non-composite) leaf filter on another column the same as a composite one", () => {
    expect(facetedNumberValues(rows, salesColumn, { field: "margin", operator: "eq", value: 20 })).toEqual([200]);
  });

  it("pushes null for a row whose column value is null/undefined", () => {
    interface RowWithGap {
      id: string;
      sales: number | null;
    }
    const withGap: RowWithGap[] = [
      { id: "a", sales: 100 },
      { id: "b", sales: null },
    ];
    const gapColumn: ColumnDef<RowWithGap> = { id: "sales", type: "number", header: "Sales", accessorKey: "sales" };
    expect(facetedNumberValues(withGap, gapColumn, null)).toEqual([100, null]);
  });
});
