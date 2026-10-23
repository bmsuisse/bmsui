import { describe, expect, it } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import type { FilterDescriptor, GridState } from "../../src/filter/types";
import { filterSortTree } from "../../src/tree/filterSortTree";

interface Node {
  key: string;
  level1: string;
  count: number | null;
  children: Node[];
}

const node = (key: string, level1: string, count: number | null, children: Node[] = []): Node => ({
  key,
  level1,
  count,
  children,
});

const TREE: Node[] = [
  node("01", "01", null, [node("01.a", "01", 5), node("01.b", "01", 9, [node("01.b.x", "01", 2)])]),
  node("02", "02", null, [node("02.a", "02", 1)]),
  node("03", "03", null, [node("03.a", "03", 7)]),
];

const columns: ColumnDef<Node>[] = [
  { id: "level1", type: "string", header: "Level 1", accessorKey: "level1" },
  // accessorFn, not a plain field: values must come through getColumnValue.
  { id: "count", type: "number", header: "Count", accessorFn: (n) => n.count },
];
const options = { getRowId: (n: Node) => n.key, getChildren: (n: Node) => n.children, columns };
const state = (filters: FilterDescriptor[], sort: GridState["sort"] = []): Pick<GridState, "filter" | "sort"> => ({
  filter: filters.length > 0 ? { logic: "and", filters } : null,
  sort,
});

/** Visible keys, depth-first, through the returned children map. */
function keys(result: ReturnType<typeof filterSortTree<Node>>, nodes = result.roots): string[] {
  return nodes.flatMap((n) => [n.key, ...keys(result, result.childrenMap.get(n.key) ?? [])]);
}

describe("filterSortTree", () => {
  it("keeps everything and opens nothing without filter or sort", () => {
    const result = filterSortTree(TREE, state([]), options);
    expect(keys(result)).toEqual(["01", "01.a", "01.b", "01.b.x", "02", "02.a", "03", "03.a"]);
    expect(result.expandedIds.size).toBe(0);
  });

  it("keeps a deep match under its ancestors and opens them", () => {
    const result = filterSortTree(TREE, state([{ field: "count", operator: "eq", value: 2 }]), options);
    expect(keys(result)).toEqual(["01", "01.b", "01.b.x"]);
    expect([...result.expandedIds].sort()).toEqual(["01", "01.b"]);
  });

  it("is none of drops the picked branches", () => {
    const result = filterSortTree(TREE, state([{ field: "level1", operator: "notIn", value: ["01", "03"] }]), options);
    expect(keys(result)).toEqual(["02", "02.a"]);
  });

  it("combines filters with AND per node", () => {
    const result = filterSortTree(
      TREE,
      state([
        { field: "level1", operator: "in", value: ["01", "02"] },
        { field: "count", operator: "gte", value: 6 },
      ]),
      options,
    );
    // 01.b matches itself, so it keeps its (non-matching) child, closed.
    expect(keys(result)).toEqual(["01", "01.b", "01.b.x"]);
    expect([...result.expandedIds]).toEqual(["01"]);
  });

  it("a matching parent whose children don't match keeps them, so its chevron expands to something", () => {
    const result = filterSortTree(TREE, state([{ field: "level1", operator: "eq", value: "02" }]), options);
    expect(keys(result)).toEqual(["02", "02.a"]);
    const parentOnly = filterSortTree(TREE, state([{ field: "key", operator: "eq", value: "03" }]), options);
    expect(keys(parentOnly)).toEqual(["03", "03.a"]);
    expect(parentOnly.expandedIds.size).toBe(0);
  });

  it("sorts siblings at every level without opening anything", () => {
    const result = filterSortTree(TREE, state([], [{ field: "count", dir: "desc" }]), options);
    expect(keys(result)).toEqual(["01", "01.b", "01.b.x", "01.a", "02", "02.a", "03", "03.a"]);
    expect(result.expandedIds.size).toBe(0);
    const byLevel = filterSortTree(TREE, state([], [{ field: "level1", dir: "desc" }]), options);
    expect(byLevel.roots.map((n) => n.key)).toEqual(["03", "02", "01"]);
  });

  it("prefers lazily loaded children from childrenMap", () => {
    const lazy = new Map([["02", [node("02.z", "02", 99)]]]);
    const result = filterSortTree(TREE, state([{ field: "count", operator: "eq", value: 99 }]), {
      ...options,
      childrenMap: lazy,
    });
    expect(keys(result)).toEqual(["02", "02.z"]);
  });
});
