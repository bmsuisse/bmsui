import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import { useVisibleColumns } from "../../src/hooks/useVisibleColumns";

interface Row {
  id: string;
  name: string;
  age: number;
}

const columns: ColumnDef<Row>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
  { id: "age", type: "number", header: "Age", accessorKey: "age" },
];

describe("useVisibleColumns", () => {
  it("returns every column unchanged when columnVisibility is omitted", () => {
    const { result } = renderHook(() => useVisibleColumns(columns, undefined));
    expect(result.current).toBe(columns);
  });

  it("filters out a column explicitly marked false", () => {
    const { result } = renderHook(() => useVisibleColumns(columns, { age: false }));
    expect(result.current.map((c) => c.id)).toEqual(["name"]);
  });

  it("treats a missing key as visible, matching TanStack's VisibilityState convention", () => {
    const { result } = renderHook(() => useVisibleColumns(columns, { age: true }));
    expect(result.current.map((c) => c.id)).toEqual(["name", "age"]);
  });

  it("reorders columns by columnOrder, then applies visibility", () => {
    const { result } = renderHook(() => useVisibleColumns(columns, { name: false }, ["age", "name"]));
    expect(result.current.map((c) => c.id)).toEqual(["age"]);
    const { result: all } = renderHook(() => useVisibleColumns(columns, undefined, ["age", "name"]));
    expect(all.current.map((c) => c.id)).toEqual(["age", "name"]);
  });

  it("returns a stable reference across re-renders when columns/columnVisibility don't change identity", () => {
    const visibility = { age: false };
    const { result, rerender } = renderHook(() => useVisibleColumns(columns, visibility));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
