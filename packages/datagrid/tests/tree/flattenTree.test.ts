import { describe, expect, it } from "vitest";
import { flattenTree } from "../../src/tree/flattenTree";
import type { TreeAccessors } from "../../src/tree/types";

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const accessors: TreeAccessors<Node> = {
  getRowId: (row) => row.id,
  getChildren: (row) => row.children,
};

const tree: Node[] = [
  {
    id: "a",
    label: "A",
    children: [
      { id: "a1", label: "A1" },
      { id: "a2", label: "A2", children: [{ id: "a2a", label: "A2a" }] },
    ],
  },
  { id: "b", label: "B" },
];

describe("flattenTree", () => {
  it("returns only root rows when nothing is expanded", () => {
    const flat = flattenTree(tree, accessors, {}, new Map());
    expect(flat.map((r) => r.id)).toEqual(["a", "b"]);
    expect(flat[0]).toMatchObject({ depth: 0, hasChildren: true, isExpanded: false });
    expect(flat[1]).toMatchObject({ depth: 0, hasChildren: false, isExpanded: false });
  });

  it("includes a node's direct children once it's expanded, at depth+1", () => {
    const flat = flattenTree(tree, accessors, { a: true }, new Map());
    expect(flat.map((r) => r.id)).toEqual(["a", "a1", "a2", "b"]);
    expect(flat.find((r) => r.id === "a1")).toMatchObject({ depth: 1 });
  });

  it("does not descend into a collapsed grandchild even if its parent is expanded", () => {
    const flat = flattenTree(tree, accessors, { a: true }, new Map());
    expect(flat.map((r) => r.id)).not.toContain("a2a");
  });

  it("descends multiple levels when every ancestor is expanded", () => {
    const flat = flattenTree(tree, accessors, { a: true, a2: true }, new Map());
    expect(flat.map((r) => r.id)).toEqual(["a", "a1", "a2", "a2a", "b"]);
    expect(flat.find((r) => r.id === "a2a")).toMatchObject({ depth: 2 });
  });

  it("prefers childrenOverride over getChildren when a node has been lazily fetched", () => {
    const lazyNode: Node = { id: "c", label: "C" }; // no `children` field at all
    const override = new Map<string, Node[]>([["c", [{ id: "c1", label: "C1" }]]]);
    const flat = flattenTree([lazyNode], accessors, { c: true }, override);
    expect(flat.map((r) => r.id)).toEqual(["c", "c1"]);
  });

  it("childrenOverride wins even when getChildren already returns a (stale) batch", () => {
    const node: Node = { id: "d", label: "D", children: [{ id: "stale", label: "Stale" }] };
    const override = new Map<string, Node[]>([["d", [{ id: "fresh", label: "Fresh" }]]]);
    const flat = flattenTree([node], accessors, { d: true }, override);
    expect(flat.map((r) => r.id)).toEqual(["d", "fresh"]);
  });

  it("defaults hasChildren from getChildren's length when no explicit hasChildren accessor is given", () => {
    const flat = flattenTree(tree, accessors, {}, new Map());
    expect(flat.find((r) => r.id === "b")).toMatchObject({ hasChildren: false });
    expect(flat.find((r) => r.id === "a")).toMatchObject({ hasChildren: true });
  });

  it("uses an explicit hasChildren accessor over the getChildren-length default, e.g. for lazy nodes with no loaded children yet", () => {
    const lazyOnly: Node = { id: "e", label: "E" }; // getChildren -> undefined
    const withHasChildren: TreeAccessors<Node> = {
      ...accessors,
      hasChildren: (row) => row.id === "e",
    };
    const flat = flattenTree([lazyOnly], withHasChildren, {}, new Map());
    expect(flat[0]).toMatchObject({ hasChildren: true });
  });

  it("returns an empty array for an empty root list", () => {
    expect(flattenTree([], accessors, {}, new Map())).toEqual([]);
  });
});
