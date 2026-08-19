import { describe, expect, it } from "vitest";
import { groupRows } from "../../src/grid/groupRows";

interface Item {
  id: string;
  tier: string;
}

describe("groupRows", () => {
  it("buckets items by key, preserving first-seen bucket order", () => {
    const items: Item[] = [
      { id: "1", tier: "b" },
      { id: "2", tier: "a" },
      { id: "3", tier: "b" },
      { id: "4", tier: "a" },
    ];
    const buckets = groupRows(items, (item) => item.tier);
    expect(buckets.map((bucket) => bucket.key)).toEqual(["b", "a"]);
    expect(buckets[0]!.items.map((item) => item.id)).toEqual(["1", "3"]);
    expect(buckets[1]!.items.map((item) => item.id)).toEqual(["2", "4"]);
  });

  it("returns an empty array for empty input", () => {
    expect(groupRows<Item>([], (item) => item.tier)).toEqual([]);
  });

  it("returns a single bucket when every item shares the same key", () => {
    const items: Item[] = [
      { id: "1", tier: "x" },
      { id: "2", tier: "x" },
    ];
    const buckets = groupRows(items, (item) => item.tier);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.items).toHaveLength(2);
  });
});
