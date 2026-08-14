import { afterEach, describe, expect, it } from "vitest";
import {
  readPersistedVisibility,
  storageKeyFor,
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
