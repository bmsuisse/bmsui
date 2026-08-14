import { describe, expect, it } from "vitest";
import {
  type CompositeFilterDescriptor,
  type FilterDescriptor,
  fieldKey,
  isCompositeFilterDescriptor,
  isFilterDescriptor,
} from "../../src/filter/types";

describe("filter contract type guards", () => {
  const leaf: FilterDescriptor = { field: "name", operator: "contains", value: "a" };
  const composite: CompositeFilterDescriptor = { logic: "and", filters: [leaf] };

  it("isFilterDescriptor narrows a leaf node", () => {
    expect(isFilterDescriptor(leaf)).toBe(true);
    expect(isFilterDescriptor(composite)).toBe(false);
  });

  it("isCompositeFilterDescriptor narrows a composite node", () => {
    expect(isCompositeFilterDescriptor(composite)).toBe(true);
    expect(isCompositeFilterDescriptor(leaf)).toBe(false);
  });

  it("supports nested composites", () => {
    const nested: CompositeFilterDescriptor = {
      logic: "or",
      filters: [composite, { field: "age", operator: "gte", value: 18 }],
    };
    expect(isCompositeFilterDescriptor(nested.filters[0]!)).toBe(true);
    expect(isFilterDescriptor(nested.filters[1]!)).toBe(true);
  });
});

describe("fieldKey", () => {
  it("returns a plain string field unchanged", () => {
    expect(fieldKey("customer_name")).toBe("customer_name");
  });

  it("joins a pre-qualified path with dots", () => {
    expect(fieldKey(["c", "customer_name"])).toBe("c.customer_name");
  });
});

describe("construction", () => {
  it("allows a unary operator with no value", () => {
    const f: FilterDescriptor = { field: "deleted_at", operator: "isNull" };
    expect(f.value).toBeUndefined();
  });

  it("allows array values for in/notIn/between", () => {
    const inFilter: FilterDescriptor = { field: "status", operator: "in", value: ["a", "b"] };
    const between: FilterDescriptor = { field: "age", operator: "between", value: [18, 65] };
    expect(inFilter.value).toEqual(["a", "b"]);
    expect(between.value).toEqual([18, 65]);
  });

  it("allows ignoreCase on string operators", () => {
    const f: FilterDescriptor = {
      field: "name",
      operator: "contains",
      value: "a",
      ignoreCase: true,
    };
    expect(f.ignoreCase).toBe(true);
  });
});
