import { describe, expect, it } from "vitest";
import { computeSelectionStates } from "../../src/tree/selectionState";
import type { TreeAccessors } from "../../src/tree/types";

interface Node {
  id: string;
  children?: Node[];
}

const accessors: TreeAccessors<Node> = {
  getRowId: (row) => row.id,
  getChildren: (row) => row.children,
};

const tree: Node[] = [
  {
    id: "a",
    children: [
      { id: "a1", children: [{ id: "a1a" }, { id: "a1b" }] },
      { id: "a2" },
    ],
  },
  { id: "b" },
];

describe("computeSelectionStates", () => {
  it("marks a selected node checked, and everything else unchecked/not-indeterminate", () => {
    const states = computeSelectionStates(tree, accessors, new Map(), new Set(["b"]));
    expect(states.get("b")).toEqual({ checked: true, indeterminate: false });
    expect(states.get("a1a")).toEqual({ checked: false, indeterminate: false });
  });

  it("marks a parent indeterminate when only some of its loaded children are selected", () => {
    const states = computeSelectionStates(tree, accessors, new Map(), new Set(["a1a"]));
    expect(states.get("a1")).toEqual({ checked: false, indeterminate: true });
    expect(states.get("a")).toEqual({ checked: false, indeterminate: true });
    expect(states.get("a2")).toEqual({ checked: false, indeterminate: false });
  });

  it("propagates indeterminate up multiple levels", () => {
    const states = computeSelectionStates(tree, accessors, new Map(), new Set(["a1b"]));
    expect(states.get("a1")?.indeterminate).toBe(true);
    expect(states.get("a")?.indeterminate).toBe(true);
  });

  it("a selected node reports checked regardless of its own children's state (children aren't inspected once the node itself is selected)", () => {
    const states = computeSelectionStates(tree, accessors, new Map(), new Set(["a1"]));
    expect(states.get("a1")).toEqual({ checked: true, indeterminate: false });
    // Still walks into children for its own indeterminate bookkeeping, but the parent's checked
    // state at "a" is driven only by whether "a1" itself reads checked/indeterminate.
    expect(states.get("a")).toEqual({ checked: false, indeterminate: true });
  });

  it("an unloaded/childless node with nothing selected reads unchecked, not indeterminate", () => {
    const states = computeSelectionStates(tree, accessors, new Map(), new Set());
    expect(states.get("a2")).toEqual({ checked: false, indeterminate: false });
  });

  it("a selected descendant hidden behind a node with no loaded children yet does not make that ancestor indeterminate", () => {
    // "c" has children server-side (lazy), but nothing has been fetched — no
    // entry in childrenOverride, and getChildren returns undefined — so a
    // hypothetically-selected descendant id is simply invisible to the walk.
    const lazyRoot: Node[] = [{ id: "c" }];
    const states = computeSelectionStates(lazyRoot, accessors, new Map(), new Set(["c-hidden-child"]));
    expect(states.get("c")).toEqual({ checked: false, indeterminate: false });
  });

  it("returns an empty map for an empty root list", () => {
    expect(computeSelectionStates([], accessors, new Map(), new Set())).toEqual(new Map());
  });
});
