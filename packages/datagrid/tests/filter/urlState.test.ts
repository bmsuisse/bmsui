import { describe, expect, it } from "vitest";
import { decodeGridStateSearch, encodeGridStateSearch, validateGridStateSearch } from "../../src/filter/urlState";
import type { GridState } from "../../src/filter/types";

const state: Pick<GridState, "filter" | "sort"> = {
  filter: {
    logic: "and",
    filters: [
      { field: "status", operator: "in", value: ["open", "closed"] },
      { field: "name", operator: "contains", value: "ac", ignoreCase: true },
      { field: "amount", operator: "between", value: [10, 20] },
      { field: "notes", operator: "isNull" },
    ],
  },
  sort: [{ field: "amount", dir: "desc" }],
};

describe("URL codec", () => {
  it("round-trips filters (incl. ignoreCase and unary) and sort as compact tuples", () => {
    const encoded = encodeGridStateSearch(state);
    expect(encoded.f).toEqual([
      ["status", "in", ["open", "closed"]],
      ["name", "contains", "ac", 1],
      ["amount", "between", [10, 20]],
      ["notes", "isNull"],
    ]);
    expect(encoded.s).toEqual([["amount", "desc"]]);
    expect(decodeGridStateSearch(JSON.parse(JSON.stringify(encoded)))).toEqual(state);
  });

  it("uses a prefix and drops empty parts", () => {
    expect(encodeGridStateSearch({ filter: null, sort: [] }, "a")).toEqual({ af: undefined, as: undefined });
    expect(decodeGridStateSearch(encodeGridStateSearch(state, "a"), "a")).toEqual(state);
    expect(decodeGridStateSearch(encodeGridStateSearch(state, "a"))).toEqual({ filter: null, sort: [] });
  });

  it("drops malformed tuples and unknown operators", () => {
    const decoded = decodeGridStateSearch({
      f: [
        ["a", "like", "x"],
        ["b", "in", []],
        ["c", "between", [1]],
        ["d", "eq", { nested: true }],
        [1, "eq", "x"],
        "junk",
        ["ok", "eq", 3],
      ],
      s: [["x", "sideways"], ["y", "asc"], 7],
    });
    expect(decoded).toEqual({
      filter: { logic: "and", filters: [{ field: "ok", operator: "eq", value: 3 }] },
      sort: [{ field: "y", dir: "asc" }],
    });
  });

  it("validateGridStateSearch keeps only well-formed params", () => {
    expect(validateGridStateSearch({ f: [["a", "nope"]], s: [["y", "asc"]], other: 1 })).toEqual({
      s: [["y", "asc"]],
    });
  });
});
