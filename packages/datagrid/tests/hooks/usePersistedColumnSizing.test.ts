import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sizingStorageKeyFor } from "../../src/column-selector/persistence";
import { mergeSizing, usePersistedColumnSizing } from "../../src/hooks/usePersistedColumnSizing";
import { MIN_COLUMN_SIZE } from "../../src/hooks/useColumnSizing";

const columns = [{ id: "a", width: 100 }, { id: "b" }, { id: "c", width: 200 }];
const defaults = { a: 100, b: 150, c: 200 };

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("mergeSizing", () => {
  it("stores a changed column and clamps it to the minimum", () => {
    expect(mergeSizing({}, { ...defaults, a: 10 }, defaults)).toEqual({ a: MIN_COLUMN_SIZE });
  });

  it("drops a column dragged back to its default", () => {
    expect(mergeSizing({ a: 130 }, { ...defaults }, defaults)).toEqual({});
  });

  it("keeps overrides of hidden columns", () => {
    expect(mergeSizing({ hidden: 77 }, { ...defaults, b: 90 }, defaults)).toEqual({ hidden: 77, b: 90 });
  });
});

describe("usePersistedColumnSizing", () => {
  it("restores overrides on mount and persists only overrides on change", () => {
    window.localStorage.setItem(sizingStorageKeyFor("t"), JSON.stringify({ a: 120 }));
    const { result } = renderHook(() => usePersistedColumnSizing("t", columns));
    expect(result.current.columnSizing).toEqual({ a: 120 });
    expect(result.current.isCustomized).toBe(true);

    act(() => result.current.onColumnSizingChange({ a: 100, b: 90 }));
    expect(result.current.columnSizing).toEqual({ b: 90 });
    expect(JSON.parse(window.localStorage.getItem(sizingStorageKeyFor("t"))!)).toEqual({ b: 90 });
  });

  it("reset clears the overrides and the stored entry", () => {
    const { result } = renderHook(() => usePersistedColumnSizing("t", columns));
    act(() => result.current.onColumnSizingChange({ c: 260 }));
    act(() => result.current.reset());
    expect(result.current.columnSizing).toEqual({});
    expect(result.current.isCustomized).toBe(false);
    expect(window.localStorage.getItem(sizingStorageKeyFor("t"))).toBeNull();
  });

  it("works when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => usePersistedColumnSizing("t", columns));
    expect(result.current.columnSizing).toEqual({});
    act(() => result.current.onColumnSizingChange({ a: 300 }));
    expect(result.current.columnSizing).toEqual({ a: 300 });
  });
});
