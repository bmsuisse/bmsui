import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocalStorageState } from "../../src/hooks/useLocalStorageState";

// Newer Node versions ship their own (disabled) global `localStorage` that
// shadows jsdom's; give the tests a working in-memory Storage either way.
function usableStorage(): boolean {
  try {
    window.localStorage.setItem("__probe", "1");
    window.localStorage.removeItem("__probe");
    return true;
  } catch {
    return false;
  }
}
if (!usableStorage()) {
  class MemoryStorage implements Storage {
    #data = new Map<string, string>();
    get length() {
      return this.#data.size;
    }
    clear() {
      this.#data.clear();
    }
    getItem(key: string) {
      return this.#data.get(key) ?? null;
    }
    key(index: number) {
      return [...this.#data.keys()][index] ?? null;
    }
    removeItem(key: string) {
      this.#data.delete(key);
    }
    setItem(key: string, value: string) {
      this.#data.set(key, String(value));
    }
  }
  Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true });
}

describe("useLocalStorageState", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("starts from the default, persists, and supports updater functions", () => {
    const { result } = renderHook(() => useLocalStorageState("count", 0));
    expect(result.current[0]).toBe(0);
    act(() => result.current[1]((n) => n + 1));
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(2);
    expect(window.localStorage.getItem("count")).toBe("2");
  });

  it("reads an existing value and falls back on corrupt data", () => {
    window.localStorage.setItem("prefs", JSON.stringify({ dense: true }));
    const { result } = renderHook(() => useLocalStorageState("prefs", { dense: false }));
    expect(result.current[0]).toEqual({ dense: true });

    window.localStorage.setItem("broken", "{not json");
    const broken = renderHook(() => useLocalStorageState("broken", "fallback"));
    expect(broken.result.current[0]).toBe("fallback");
  });

  it("keeps hooks with the same key in sync and remove() resets to default", () => {
    const a = renderHook(() => useLocalStorageState("shared", "x"));
    const b = renderHook(() => useLocalStorageState("shared", "x"));
    act(() => a.result.current[1]("y"));
    expect(b.result.current[0]).toBe("y");
    act(() => b.result.current[2]());
    expect(a.result.current[0]).toBe("x");
    expect(window.localStorage.getItem("shared")).toBeNull();
  });

  it("follows writes from other tabs via the storage event", () => {
    const { result } = renderHook(() => useLocalStorageState("tab", 1));
    act(() => {
      window.localStorage.setItem("tab", "5");
      window.dispatchEvent(new StorageEvent("storage", { key: "tab", newValue: "5" }));
    });
    expect(result.current[0]).toBe(5);
  });

  it("does not throw when storage is blocked and keeps the value in memory", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });
    const { result } = renderHook(() => useLocalStorageState("blocked", "a"));
    expect(result.current[0]).toBe("a");
    act(() => result.current[1]("b"));
    expect(result.current[0]).toBe("b");
  });

  it("uses custom serialize/deserialize", () => {
    const { result } = renderHook(() =>
      useLocalStorageState("date", new Date(0), {
        serialize: (d) => d.toISOString(),
        deserialize: (raw) => new Date(raw),
      }),
    );
    act(() => result.current[1](new Date("2026-01-02T00:00:00.000Z")));
    expect(window.localStorage.getItem("date")).toBe("2026-01-02T00:00:00.000Z");
    expect(result.current[0].getUTCDate()).toBe(2);
  });

  it("switching between two unset keys re-reads the default for the new key", () => {
    const { result, rerender } = renderHook(({ id }) => useLocalStorageState(`draft:${id}`, { owner: id }), {
      initialProps: { id: "a" },
    });
    expect(result.current[0]).toEqual({ owner: "a" });
    rerender({ id: "b" });
    expect(result.current[0]).toEqual({ owner: "b" });
  });
});
