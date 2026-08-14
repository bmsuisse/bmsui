import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTreeState } from "../../src/tree/useTreeState";
import type { TreeAccessors } from "../../src/tree/types";

interface Node {
  id: string;
  children?: Node[];
}

const accessors: TreeAccessors<Node> = {
  getRowId: (row) => row.id,
  getChildren: (row) => row.children,
};

const eagerTree: Node[] = [{ id: "a", children: [{ id: "a1" }] }, { id: "b" }];

describe("useTreeState", () => {
  it("starts fully collapsed", () => {
    const { result } = renderHook(() => useTreeState<Node>({ data: eagerTree, ...accessors }));
    expect(result.current.expanded).toEqual({});
  });

  it("toggleExpand flips a node's expanded flag without needing to load anything for eager children", () => {
    const { result } = renderHook(() => useTreeState<Node>({ data: eagerTree, ...accessors }));
    act(() => result.current.toggleExpand(eagerTree[0]!));
    expect(result.current.expanded).toEqual({ a: true });
    act(() => result.current.toggleExpand(eagerTree[0]!));
    expect(result.current.expanded).toEqual({ a: false });
  });

  it("calls onLoadChildren when expanding a lazy node with no eager children, and caches the result", async () => {
    const lazyNode: Node = { id: "c" };
    const onLoadChildren = vi.fn().mockResolvedValue([{ id: "c1" }]);
    const { result } = renderHook(() =>
      useTreeState<Node>({
        data: [lazyNode],
        getRowId: (row) => row.id,
        getChildren: (row) => row.children,
        hasChildren: (row) => row.id === "c",
        onLoadChildren,
      }),
    );

    act(() => result.current.toggleExpand(lazyNode));
    expect(result.current.loadingIds.has("c")).toBe(true);

    await waitFor(() => expect(result.current.loadingIds.has("c")).toBe(false));
    expect(onLoadChildren).toHaveBeenCalledOnce();
    expect(result.current.childrenMap.get("c")).toEqual([{ id: "c1" }]);

    // Collapsing and re-expanding must not refetch.
    act(() => result.current.toggleExpand(lazyNode));
    act(() => result.current.toggleExpand(lazyNode));
    expect(onLoadChildren).toHaveBeenCalledOnce();
  });

  it("surfaces a failed load in errorIds instead of throwing, and retry() re-attempts it", async () => {
    const lazyNode: Node = { id: "d" };
    const onLoadChildren = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce([{ id: "d1" }]);
    const { result } = renderHook(() =>
      useTreeState<Node>({
        data: [lazyNode],
        getRowId: (row) => row.id,
        getChildren: (row) => row.children,
        hasChildren: (row) => row.id === "d",
        onLoadChildren,
      }),
    );

    act(() => result.current.toggleExpand(lazyNode));
    await waitFor(() => expect(result.current.errorIds.get("d")).toBe("network down"));
    expect(result.current.childrenMap.has("d")).toBe(false);

    act(() => result.current.retry(lazyNode));
    await waitFor(() => expect(result.current.childrenMap.get("d")).toEqual([{ id: "d1" }]));
    expect(result.current.errorIds.has("d")).toBe(false);
  });

  it("does not attempt to load children for a node with no onLoadChildren and no eager children", () => {
    const leaf: Node = { id: "e" };
    const { result } = renderHook(() =>
      useTreeState<Node>({ data: [leaf], ...accessors, hasChildren: () => true }),
    );
    act(() => result.current.toggleExpand(leaf));
    expect(result.current.loadingIds.size).toBe(0);
    expect(result.current.errorIds.size).toBe(0);
  });

  it("expandToLevel expands every node down to the given depth, loading lazy children along the way", async () => {
    const root: Node = { id: "root" };
    const onLoadChildren = vi.fn(async (row: Node) => {
      if (row.id === "root") return [{ id: "mid" }];
      if (row.id === "mid") return [{ id: "leaf" }];
      return [];
    });
    const { result } = renderHook(() =>
      useTreeState<Node>({
        data: [root],
        getRowId: (row) => row.id,
        getChildren: (row) => row.children,
        hasChildren: () => true,
        onLoadChildren,
      }),
    );

    await act(async () => {
      await result.current.expandToLevel(2);
    });

    expect(result.current.expanded).toEqual({ root: true, mid: true });
    expect(result.current.childrenMap.get("root")).toEqual([{ id: "mid" }]);
    expect(result.current.childrenMap.get("mid")).toEqual([{ id: "leaf" }]);
    // "leaf" itself is never visited as a parent since depth 2 is the cutoff.
    expect(onLoadChildren).not.toHaveBeenCalledWith({ id: "leaf" });
  });

  it("supports controlled expanded state via onExpandedChange", () => {
    const onExpandedChange = vi.fn();
    const { result } = renderHook(() =>
      useTreeState<Node>({ data: eagerTree, ...accessors, expanded: { a: false }, onExpandedChange }),
    );
    act(() => result.current.toggleExpand(eagerTree[0]!));
    expect(onExpandedChange).toHaveBeenCalledWith({ a: true });
  });
});
