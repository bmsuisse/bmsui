import { describe, expect, it } from "vitest";
import { alignClassName, defaultAlign, defaultFormat } from "../../src/column/format";
import type { ColumnDef } from "../../src/column/types";

interface Row {
  name: string;
  amount: number;
  price: number;
  createdAt: string;
  active: boolean;
  status: string;
}

const stringCol: ColumnDef<Row> = { id: "name", type: "string", header: "Name" };
const numberCol: ColumnDef<Row> = { id: "amount", type: "number", header: "Amount" };
const currencyCol: ColumnDef<Row> = {
  id: "price",
  type: "currency",
  header: "Price",
  currency: "USD",
};
const dateCol: ColumnDef<Row> = { id: "createdAt", type: "date", header: "Created" };
const datetimeCol: ColumnDef<Row> = { id: "createdAt", type: "datetime", header: "Created" };
const booleanCol: ColumnDef<Row> = { id: "active", type: "boolean", header: "Active" };
const enumCol: ColumnDef<Row> = {
  id: "status",
  type: "enum",
  header: "Status",
  options: [
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ],
};

describe("defaultAlign", () => {
  it("aligns number/currency right", () => {
    expect(defaultAlign(numberCol)).toBe("right");
    expect(defaultAlign(currencyCol)).toBe("right");
  });

  it("aligns boolean center", () => {
    expect(defaultAlign(booleanCol)).toBe("center");
  });

  it("aligns string/enum/date/datetime left", () => {
    expect(defaultAlign(stringCol)).toBe("left");
    expect(defaultAlign(enumCol)).toBe("left");
    expect(defaultAlign(dateCol)).toBe("left");
    expect(defaultAlign(datetimeCol)).toBe("left");
  });
});

describe("alignClassName", () => {
  it("returns a literal Tailwind class per alignment (not a runtime-interpolated one)", () => {
    // Written as literal strings on both sides so a Tailwind content-scan
    // regression (reintroducing `text-${align}`) would fail this comparison.
    expect(alignClassName(numberCol)).toBe("text-right");
    expect(alignClassName(currencyCol)).toBe("text-right");
    expect(alignClassName(booleanCol)).toBe("text-center");
    expect(alignClassName(stringCol)).toBe("text-left");
  });
});

describe("defaultFormat", () => {
  it("formats null/undefined as empty string for every type", () => {
    for (const col of [stringCol, numberCol, currencyCol, dateCol, booleanCol, enumCol]) {
      expect(defaultFormat(col, null)).toBe("");
      expect(defaultFormat(col, undefined)).toBe("");
    }
  });

  it("formats a string column as-is", () => {
    expect(defaultFormat(stringCol, "Acme Inc.")).toBe("Acme Inc.");
  });

  it("formats a number column with locale grouping", () => {
    expect(defaultFormat(numberCol, 1234567)).toBe((1234567).toLocaleString());
  });

  it("falls back to raw string for a non-numeric number value", () => {
    expect(defaultFormat(numberCol, "not-a-number")).toBe("not-a-number");
  });

  it("formats a currency column using Intl.NumberFormat", () => {
    const formatted = defaultFormat(currencyCol, 1234.5);
    expect(formatted).toBe(
      new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(1234.5),
    );
  });

  it("defaults currency to USD when unspecified", () => {
    const col: ColumnDef<Row> = { id: "price", type: "currency", header: "Price" };
    expect(defaultFormat(col, 10)).toContain("10");
  });

  it("formats a date column", () => {
    const iso = "2024-03-15T00:00:00.000Z";
    expect(defaultFormat(dateCol, iso)).toBe(new Date(iso).toLocaleDateString());
  });

  it("formats a datetime column", () => {
    const iso = "2024-03-15T12:30:00.000Z";
    expect(defaultFormat(datetimeCol, iso)).toBe(new Date(iso).toLocaleString());
  });

  it("falls back to raw string for an unparseable date", () => {
    expect(defaultFormat(dateCol, "not-a-date")).toBe("not-a-date");
  });

  it("formats a bare date-only string on the same calendar day, regardless of timezone", () => {
    // Regression test: `new Date("2024-06-15")` parses as UTC midnight,
    // which displays as June 14th in any timezone behind UTC — exactly the
    // shape a "date" column's value takes coming out of e.g. SQLite (see
    // the demo app's created_at column). Pin TZ to one that's unambiguously
    // behind UTC so this is deterministic regardless of the machine running
    // the test.
    const originalTz = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(defaultFormat(dateCol, "2024-06-15")).toBe(new Date(2024, 5, 15).toLocaleDateString());
    } finally {
      process.env.TZ = originalTz;
    }
  });

  it("formats a boolean column as Yes/No", () => {
    expect(defaultFormat(booleanCol, true)).toBe("Yes");
    expect(defaultFormat(booleanCol, false)).toBe("No");
  });

  it("formats the string \"false\" as No, not Yes (regression: truthy-string bug)", () => {
    // A naive `value ? "Yes" : "No"` renders "Yes" here since any non-empty
    // string is truthy — a real shape for boolean data round-tripped
    // through JSON/CSV/query params.
    expect(defaultFormat(booleanCol, "false")).toBe("No");
    expect(defaultFormat(booleanCol, "true")).toBe("Yes");
    expect(defaultFormat(booleanCol, "FALSE")).toBe("No");
  });

  it("formats numeric 0/1 booleans", () => {
    expect(defaultFormat(booleanCol, 0)).toBe("No");
    expect(defaultFormat(booleanCol, 1)).toBe("Yes");
  });

  it("formats an enum column by looking up the option label", () => {
    expect(defaultFormat(enumCol, "open")).toBe("Open");
    expect(defaultFormat(enumCol, "closed")).toBe("Closed");
  });

  it("falls back to the raw value for an unknown enum option", () => {
    expect(defaultFormat(enumCol, "unknown")).toBe("unknown");
  });
});
