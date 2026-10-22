import { afterEach, describe, expect, it } from "vitest";
import {
  orderStorageKeyFor,
  parseStoredWidths,
  readPersistedColumnSizing,
  sizingStorageKeyFor,
  writePersistedColumnSizing,
  readPersistedColumnOrder,
  readPersistedVisibility,
  storageKeyFor,
  writePersistedColumnOrder,
  writePersistedVisibility,
} from "../../src/column-selector/persistence";

afterEach(() => {
  window.localStorage.clear();
});

describe("storageKeyFor", () => {
  it("namespaces the key under bmsui-datagrid:columns:", () => {
    expect(storageKeyFor("orders")).toBe("bmsui-datagrid:columns:orders");
  });
});

describe("readPersistedVisibility", () => {
  it("returns null when nothing is stored", () => {
    expect(readPersistedVisibility("orders")).toBeNull();
  });

  it("parses a previously written value", () => {
    writePersistedVisibility("orders", { a: false, b: true });
    expect(readPersistedVisibility("orders")).toEqual({ a: false, b: true });
  });

  it("returns null (not throw) for malformed JSON", () => {
    window.localStorage.setItem(storageKeyFor("orders"), "{not-json");
    expect(() => readPersistedVisibility("orders")).not.toThrow();
    expect(readPersistedVisibility("orders")).toBeNull();
  });

  it("returns null (not throw) for valid JSON that isn't a plain object", () => {
    window.localStorage.setItem(storageKeyFor("orders"), JSON.stringify(["a", "b"]));
    expect(readPersistedVisibility("orders")).toBeNull();

    window.localStorage.setItem(storageKeyFor("orders"), JSON.stringify("just a string"));
    expect(readPersistedVisibility("orders")).toBeNull();

    window.localStorage.setItem(storageKeyFor("orders"), JSON.stringify(42));
    expect(readPersistedVisibility("orders")).toBeNull();
  });

  it("is namespaced per persistKey", () => {
    writePersistedVisibility("orders", { a: false });
    writePersistedVisibility("customers", { b: false });
    expect(readPersistedVisibility("orders")).toEqual({ a: false });
    expect(readPersistedVisibility("customers")).toEqual({ b: false });
  });
});

describe("orderStorageKeyFor", () => {
  it("namespaces the key under a distinct bmsui-datagrid:column-order: root", () => {
    expect(orderStorageKeyFor("orders")).toBe("bmsui-datagrid:column-order:orders");
    // Distinct from storageKeyFor's own key -- writing order can never shadow
    // or migrate previously stored visibility data under the same persistKey.
    expect(orderStorageKeyFor("orders")).not.toBe(storageKeyFor("orders"));
  });

  it("can never collide with storageKeyFor for any persistKey, even an adversarial one", () => {
    // A ":order"-suffix scheme would let storageKeyFor("orders:order") collide
    // with orderStorageKeyFor("orders") -- the different namespace segment
    // ("column-order" vs "columns") rules that out structurally.
    expect(orderStorageKeyFor("orders")).not.toBe(storageKeyFor("orders:order"));
    expect(orderStorageKeyFor("columns:orders")).not.toBe(storageKeyFor("orders"));
  });
});

describe("readPersistedColumnOrder", () => {
  it("returns null when nothing is stored", () => {
    expect(readPersistedColumnOrder("orders")).toBeNull();
  });

  it("parses a previously written value", () => {
    writePersistedColumnOrder("orders", ["b", "a"]);
    expect(readPersistedColumnOrder("orders")).toEqual(["b", "a"]);
  });

  it("returns null (not throw) for malformed JSON", () => {
    window.localStorage.setItem(orderStorageKeyFor("orders"), "{not-json");
    expect(() => readPersistedColumnOrder("orders")).not.toThrow();
    expect(readPersistedColumnOrder("orders")).toBeNull();
  });

  it("returns null (not throw) for valid JSON that isn't a string array", () => {
    window.localStorage.setItem(orderStorageKeyFor("orders"), JSON.stringify({ a: false }));
    expect(readPersistedColumnOrder("orders")).toBeNull();

    window.localStorage.setItem(orderStorageKeyFor("orders"), JSON.stringify(["a", 42]));
    expect(readPersistedColumnOrder("orders")).toBeNull();

    window.localStorage.setItem(orderStorageKeyFor("orders"), JSON.stringify("just a string"));
    expect(readPersistedColumnOrder("orders")).toBeNull();
  });

  it("is namespaced per persistKey, and independent of stored visibility under the same key", () => {
    writePersistedVisibility("orders", { a: false });
    writePersistedColumnOrder("orders", ["b", "a"]);
    writePersistedColumnOrder("customers", ["c"]);
    expect(readPersistedVisibility("orders")).toEqual({ a: false });
    expect(readPersistedColumnOrder("orders")).toEqual(["b", "a"]);
    expect(readPersistedColumnOrder("customers")).toEqual(["c"]);
  });
});

describe("column sizing persistence", () => {
  it("uses its own namespace", () => {
    expect(sizingStorageKeyFor("orders")).toBe("bmsui-datagrid:column-sizing:orders");
  });

  it("keeps valid widths, clamps small ones and drops junk", () => {
    expect(parseStoredWidths(JSON.stringify({ a: 120.4, b: 5, c: "x", d: -3, e: null }))).toEqual({ a: 120, b: 40 });
    expect(parseStoredWidths(null)).toEqual({});
    expect(parseStoredWidths("{not json")).toEqual({});
    expect(parseStoredWidths("[1,2]")).toEqual({});
  });

  it("round-trips, and an empty value removes the entry", () => {
    writePersistedColumnSizing("orders", { a: 90 });
    expect(readPersistedColumnSizing("orders")).toEqual({ a: 90 });
    writePersistedColumnSizing("orders", {});
    expect(window.localStorage.getItem(sizingStorageKeyFor("orders"))).toBeNull();
  });
});
