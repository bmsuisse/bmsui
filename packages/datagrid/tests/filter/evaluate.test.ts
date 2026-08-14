import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { evaluateFilter } from "../../src/filter/evaluate";
import type { CompositeFilterDescriptor, FilterDescriptor } from "../../src/filter/types";

interface Row {
  name: string;
  age: number;
  status: string;
  deletedAt: string | null;
  tags: string[];
  createdAt: string;
}

const row: Row = {
  name: "Acme Corp",
  age: 42,
  status: "active",
  deletedAt: null,
  tags: [],
  createdAt: "2024-03-15",
};

describe("evaluateFilter: no filter", () => {
  it("matches everything when the filter is null/undefined", () => {
    expect(evaluateFilter(row, null)).toBe(true);
    expect(evaluateFilter(row, undefined)).toBe(true);
  });
});

describe("evaluateFilter: eq / neq", () => {
  it("eq matches an exact value", () => {
    expect(evaluateFilter(row, { field: "status", operator: "eq", value: "active" })).toBe(true);
    expect(evaluateFilter(row, { field: "status", operator: "eq", value: "closed" })).toBe(false);
  });

  it("eq respects ignoreCase", () => {
    const f: FilterDescriptor = { field: "status", operator: "eq", value: "ACTIVE", ignoreCase: true };
    expect(evaluateFilter(row, f)).toBe(true);
    expect(evaluateFilter(row, { ...f, ignoreCase: false })).toBe(false);
  });

  it("eq is false against a null row value", () => {
    expect(evaluateFilter(row, { field: "deletedAt", operator: "eq", value: null })).toBe(false);
  });

  it("neq is the negation of eq", () => {
    expect(evaluateFilter(row, { field: "status", operator: "neq", value: "closed" })).toBe(true);
    expect(evaluateFilter(row, { field: "status", operator: "neq", value: "active" })).toBe(false);
  });

  it("neq is false (not true) against a null row value", () => {
    // Mirrors eq's null-is-never-a-match rule: neither eq nor neq claims a
    // match against a genuinely absent value.
    expect(evaluateFilter(row, { field: "deletedAt", operator: "neq", value: "anything" })).toBe(
      false,
    );
  });
});

describe("evaluateFilter: lt / lte / gt / gte", () => {
  it("lt", () => {
    expect(evaluateFilter(row, { field: "age", operator: "lt", value: 43 })).toBe(true);
    expect(evaluateFilter(row, { field: "age", operator: "lt", value: 42 })).toBe(false);
  });

  it("lte", () => {
    expect(evaluateFilter(row, { field: "age", operator: "lte", value: 42 })).toBe(true);
    expect(evaluateFilter(row, { field: "age", operator: "lte", value: 41 })).toBe(false);
  });

  it("gt", () => {
    expect(evaluateFilter(row, { field: "age", operator: "gt", value: 41 })).toBe(true);
    expect(evaluateFilter(row, { field: "age", operator: "gt", value: 42 })).toBe(false);
  });

  it("gte", () => {
    expect(evaluateFilter(row, { field: "age", operator: "gte", value: 42 })).toBe(true);
    expect(evaluateFilter(row, { field: "age", operator: "gte", value: 43 })).toBe(false);
  });

  it("orders ISO date strings lexicographically (== chronologically)", () => {
    expect(evaluateFilter(row, { field: "createdAt", operator: "gt", value: "2024-01-01" })).toBe(
      true,
    );
    expect(evaluateFilter(row, { field: "createdAt", operator: "lt", value: "2024-01-01" })).toBe(
      false,
    );
  });

  it("comparison operators are false against a null row value", () => {
    expect(evaluateFilter(row, { field: "deletedAt", operator: "gt", value: "2020-01-01" })).toBe(
      false,
    );
  });

  it("compares a numeric-string row value against a number filter value numerically, not lexicographically", () => {
    // Regression test: "9" > "10" lexicographically, which would invert this
    // verdict for any numeric column whose values arrive as strings (a
    // common shape coming out of JSON/CSV/query params).
    const stringyRow = { amount: "9" };
    expect(evaluateFilter(stringyRow, { field: "amount", operator: "gt", value: 10 })).toBe(
      false,
    );
    expect(evaluateFilter(stringyRow, { field: "amount", operator: "lt", value: 10 })).toBe(true);
  });

  it("eq/in agree with gt/lt on a numeric-string row value (regression: eq used strict === with no coercion)", () => {
    const stringyRow = { amount: "9" };
    expect(evaluateFilter(stringyRow, { field: "amount", operator: "eq", value: 9 })).toBe(true);
    expect(evaluateFilter(stringyRow, { field: "amount", operator: "in", value: [9, 10] })).toBe(
      true,
    );
  });

  it("compares a real Date row value against an ISO date-string filter bound chronologically", () => {
    // Regression test: naively normalizing a Date to its epoch-ms number and
    // then string-comparing it against an ISO string ("1710460800000" vs
    // "2020-01-01") is lexicographic nonsense, not chronological comparison.
    const dateRow = { createdAt: new Date("2024-03-15T00:00:00.000Z") };
    expect(evaluateFilter(dateRow, { field: "createdAt", operator: "gt", value: "2020-01-01" })).toBe(
      true,
    );
    expect(evaluateFilter(dateRow, { field: "createdAt", operator: "lt", value: "2020-01-01" })).toBe(
      false,
    );
    expect(
      evaluateFilter(dateRow, {
        field: "createdAt",
        operator: "between",
        value: ["2020-01-01", "2030-01-01"],
      }),
    ).toBe(true);
  });

  it("eq treats a Date row value and an equivalent ISO string filter value as equal", () => {
    const dateRow = { createdAt: new Date("2024-03-15T00:00:00.000Z") };
    expect(
      evaluateFilter(dateRow, { field: "createdAt", operator: "eq", value: "2024-03-15T00:00:00.000Z" }),
    ).toBe(true);
  });
});

describe("evaluateFilter: date-only bounds round-trip through timezones behind UTC", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    // A bare "YYYY-MM-DD" string is parsed by the JS spec as UTC midnight;
    // naively parsing it that way (as DateRangeFilter's *display* code used
    // to, and as this evaluator's toEpochMs used to) shifts it back a day in
    // any timezone behind UTC. This TZ is unambiguously behind UTC year
    // round, unlike the sandbox's own local TZ, where the bug wouldn't be
    // observable at all.
    process.env.TZ = "America/New_York";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("keeps a Date row value on its own day when compared against a same-day date-only filter bound", () => {
    // Local midnight on 2024-06-15 in America/New_York.
    const dateRow = { createdAt: new Date(2024, 5, 15, 0, 0, 0) };
    expect(
      evaluateFilter(dateRow, {
        field: "createdAt",
        operator: "between",
        value: ["2024-06-15", "2024-06-15"],
      }),
    ).toBe(true);
    expect(evaluateFilter(dateRow, { field: "createdAt", operator: "gte", value: "2024-06-15" })).toBe(
      true,
    );
  });
});

describe("evaluateFilter: between (inclusive both ends)", () => {
  it("matches values strictly inside the range", () => {
    expect(evaluateFilter(row, { field: "age", operator: "between", value: [40, 45] })).toBe(true);
  });

  it("matches the exact lower and upper bounds", () => {
    expect(evaluateFilter(row, { field: "age", operator: "between", value: [42, 50] })).toBe(true);
    expect(evaluateFilter(row, { field: "age", operator: "between", value: [30, 42] })).toBe(true);
  });

  it("excludes values outside the range", () => {
    expect(evaluateFilter(row, { field: "age", operator: "between", value: [43, 50] })).toBe(
      false,
    );
    expect(evaluateFilter(row, { field: "age", operator: "between", value: [10, 41] })).toBe(
      false,
    );
  });

  it("is false against a null row value", () => {
    expect(
      evaluateFilter(row, { field: "deletedAt", operator: "between", value: ["2020-01-01", "2030-01-01"] }),
    ).toBe(false);
  });

  it("is order-independent: [max, min] matches the same rows as [min, max]", () => {
    // A FilterDescriptor built by hand, restored from storage, or emitted by
    // a future widget might not guard bound order the way NumberRangeFilter's
    // own descriptorFor does — the evaluator itself shouldn't silently treat
    // an inverted range as "matches nothing".
    expect(evaluateFilter(row, { field: "age", operator: "between", value: [45, 40] })).toBe(true);
    expect(evaluateFilter(row, { field: "age", operator: "between", value: [50, 43] })).toBe(
      false,
    );
  });
});

describe("evaluateFilter: in / notIn", () => {
  it("in matches when the row value is a member", () => {
    expect(evaluateFilter(row, { field: "status", operator: "in", value: ["active", "pending"] })).toBe(
      true,
    );
    expect(evaluateFilter(row, { field: "status", operator: "in", value: ["closed"] })).toBe(
      false,
    );
  });

  it("in respects ignoreCase", () => {
    expect(
      evaluateFilter(row, {
        field: "status",
        operator: "in",
        value: ["ACTIVE"],
        ignoreCase: true,
      }),
    ).toBe(true);
  });

  it("notIn is the negation of in", () => {
    expect(evaluateFilter(row, { field: "status", operator: "notIn", value: ["closed"] })).toBe(
      true,
    );
    expect(evaluateFilter(row, { field: "status", operator: "notIn", value: ["active"] })).toBe(
      false,
    );
  });

  it("notIn is false against a null row value (matches SQL's NOT IN NULL -> UNKNOWN -> excluded)", () => {
    expect(evaluateFilter(row, { field: "deletedAt", operator: "notIn", value: ["x"] })).toBe(
      false,
    );
  });
});

describe("evaluateFilter: contains / doesNotContain / startsWith / endsWith", () => {
  it("contains is case-sensitive by default", () => {
    expect(evaluateFilter(row, { field: "name", operator: "contains", value: "Corp" })).toBe(true);
    expect(evaluateFilter(row, { field: "name", operator: "contains", value: "corp" })).toBe(
      false,
    );
  });

  it("contains honors ignoreCase", () => {
    expect(
      evaluateFilter(row, { field: "name", operator: "contains", value: "corp", ignoreCase: true }),
    ).toBe(true);
  });

  it("doesNotContain is the negation of contains", () => {
    expect(evaluateFilter(row, { field: "name", operator: "doesNotContain", value: "zzz" })).toBe(
      true,
    );
    expect(evaluateFilter(row, { field: "name", operator: "doesNotContain", value: "Corp" })).toBe(
      false,
    );
  });

  it("startsWith / endsWith are case-sensitive by default", () => {
    expect(evaluateFilter(row, { field: "name", operator: "startsWith", value: "Acme" })).toBe(
      true,
    );
    expect(evaluateFilter(row, { field: "name", operator: "startsWith", value: "acme" })).toBe(
      false,
    );
    expect(evaluateFilter(row, { field: "name", operator: "endsWith", value: "Corp" })).toBe(true);
    expect(evaluateFilter(row, { field: "name", operator: "endsWith", value: "corp" })).toBe(
      false,
    );
  });

  it("string operators are false against a non-string row value", () => {
    expect(evaluateFilter(row, { field: "age", operator: "contains", value: "4" })).toBe(false);
  });

  it("doesNotContain is false (not true) against a null row value", () => {
    // Mirrors notIn: SQL's `NOT LIKE` against NULL is UNKNOWN, i.e. excluded,
    // not a match. A null field "not containing" a substring is not the same
    // as the field affirmatively lacking it.
    expect(evaluateFilter(row, { field: "deletedAt", operator: "doesNotContain", value: "x" })).toBe(
      false,
    );
  });
});

describe("evaluateFilter: isNull / isNotNull / isEmpty / isNotEmpty", () => {
  it("isNull / isNotNull treat null and undefined the same", () => {
    expect(evaluateFilter(row, { field: "deletedAt", operator: "isNull" })).toBe(true);
    expect(evaluateFilter(row, { field: "status", operator: "isNull" })).toBe(false);
    expect(evaluateFilter(row, { field: "status", operator: "isNotNull" })).toBe(true);
    expect(evaluateFilter(row, { field: "deletedAt", operator: "isNotNull" })).toBe(false);
  });

  it("isEmpty treats null, empty string, and empty array as empty", () => {
    expect(evaluateFilter(row, { field: "deletedAt", operator: "isEmpty" })).toBe(true);
    expect(evaluateFilter(row, { field: "tags", operator: "isEmpty" })).toBe(true);
    expect(evaluateFilter(row, { field: "status", operator: "isEmpty" })).toBe(false);
  });

  it("isNotEmpty is the negation of isEmpty", () => {
    expect(evaluateFilter(row, { field: "status", operator: "isNotEmpty" })).toBe(true);
    expect(evaluateFilter(row, { field: "tags", operator: "isNotEmpty" })).toBe(false);
  });
});

describe("evaluateFilter: pre-qualified / nested field paths", () => {
  interface JoinedRow {
    c: { customer_name: string };
  }
  const joinedRow: JoinedRow = { c: { customer_name: "Acme" } };

  it("resolves a string[] field path as nested access", () => {
    expect(
      evaluateFilter(joinedRow, { field: ["c", "customer_name"], operator: "eq", value: "Acme" }),
    ).toBe(true);
  });
});

describe("evaluateFilter: AND/OR composite nesting", () => {
  it("AND requires every child filter to match", () => {
    const filter: CompositeFilterDescriptor = {
      logic: "and",
      filters: [
        { field: "status", operator: "eq", value: "active" },
        { field: "age", operator: "gte", value: 40 },
      ],
    };
    expect(evaluateFilter(row, filter)).toBe(true);
    expect(
      evaluateFilter(row, { ...filter, filters: [...filter.filters, { field: "age", operator: "gt", value: 100 }] }),
    ).toBe(false);
  });

  it("OR requires at least one child filter to match", () => {
    const filter: CompositeFilterDescriptor = {
      logic: "or",
      filters: [
        { field: "status", operator: "eq", value: "closed" },
        { field: "age", operator: "gte", value: 40 },
      ],
    };
    expect(evaluateFilter(row, filter)).toBe(true);
    expect(
      evaluateFilter(row, {
        logic: "or",
        filters: [
          { field: "status", operator: "eq", value: "closed" },
          { field: "age", operator: "gt", value: 100 },
        ],
      }),
    ).toBe(false);
  });

  it("supports two levels of nesting: (a AND b) OR (c AND d)", () => {
    const filter: CompositeFilterDescriptor = {
      logic: "or",
      filters: [
        {
          logic: "and",
          filters: [
            { field: "status", operator: "eq", value: "active" },
            { field: "age", operator: "gte", value: 40 },
          ],
        },
        {
          logic: "and",
          filters: [
            { field: "status", operator: "eq", value: "closed" },
            { field: "age", operator: "lt", value: 10 },
          ],
        },
      ],
    };
    expect(evaluateFilter(row, filter)).toBe(true);

    const nonMatching: CompositeFilterDescriptor = {
      logic: "or",
      filters: [
        {
          logic: "and",
          filters: [{ field: "status", operator: "eq", value: "closed" }],
        },
        {
          logic: "and",
          filters: [{ field: "age", operator: "gt", value: 100 }],
        },
      ],
    };
    expect(evaluateFilter(row, nonMatching)).toBe(false);
  });

  it("an empty `filters` array is vacuously true for AND, false for OR", () => {
    expect(evaluateFilter(row, { logic: "and", filters: [] })).toBe(true);
    expect(evaluateFilter(row, { logic: "or", filters: [] })).toBe(false);
  });
});
