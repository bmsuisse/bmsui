import { describe, expect, it } from "vitest";
import { coerceValueForColumn } from "../../src/cell-editing/coerce";
import type { ColumnDef } from "../../src/column/types";

interface Row {
  name: string;
}

const stringCol: ColumnDef<Row> = { id: "name", type: "string", header: "Name" };
const numberCol: ColumnDef<Row> = { id: "amount", type: "number", header: "Amount" };
const currencyCol: ColumnDef<Row> = { id: "price", type: "currency", header: "Price" };
const booleanCol: ColumnDef<Row> = { id: "active", type: "boolean", header: "Active" };
const dateCol: ColumnDef<Row> = { id: "joined", type: "date", header: "Joined" };
const enumCol: ColumnDef<Row> = {
  id: "status",
  type: "enum",
  header: "Status",
  options: [
    { value: "pending", label: "Pending" },
    { value: "shipped", label: "Shipped" },
  ],
};

describe("coerceValueForColumn — string", () => {
  it("passes the raw text through as-is", () => {
    expect(coerceValueForColumn(stringCol, "Charlie")).toEqual({ value: "Charlie" });
  });

  it("accepts an empty string as itself a valid value", () => {
    expect(coerceValueForColumn(stringCol, "")).toEqual({ value: "" });
  });
});

describe("coerceValueForColumn — number/currency", () => {
  it("parses a valid numeric string", () => {
    expect(coerceValueForColumn(numberCol, "42")).toEqual({ value: 42 });
    expect(coerceValueForColumn(numberCol, "-3.5")).toEqual({ value: -3.5 });
    expect(coerceValueForColumn(currencyCol, "19.99")).toEqual({ value: 19.99 });
  });

  it("treats an empty/whitespace-only string as clearing the value (null), not a failure", () => {
    expect(coerceValueForColumn(numberCol, "")).toEqual({ value: null });
    expect(coerceValueForColumn(numberCol, "   ")).toEqual({ value: null });
  });

  it("returns undefined (uncoercible) for non-numeric text", () => {
    expect(coerceValueForColumn(numberCol, "abc")).toBeUndefined();
  });
});

describe("coerceValueForColumn — boolean", () => {
  it("recognizes true/false, yes/no, 1/0, case-insensitively", () => {
    expect(coerceValueForColumn(booleanCol, "true")).toEqual({ value: true });
    expect(coerceValueForColumn(booleanCol, "TRUE")).toEqual({ value: true });
    expect(coerceValueForColumn(booleanCol, "yes")).toEqual({ value: true });
    expect(coerceValueForColumn(booleanCol, "1")).toEqual({ value: true });
    expect(coerceValueForColumn(booleanCol, "false")).toEqual({ value: false });
    expect(coerceValueForColumn(booleanCol, "no")).toEqual({ value: false });
    expect(coerceValueForColumn(booleanCol, "0")).toEqual({ value: false });
  });

  it("returns undefined for unrecognized text", () => {
    expect(coerceValueForColumn(booleanCol, "maybe")).toBeUndefined();
  });
});

describe("coerceValueForColumn — date", () => {
  it("parses an ISO date string into a real Date", () => {
    const result = coerceValueForColumn(dateCol, "2026-03-01");
    expect(result?.value).toBeInstanceOf(Date);
  });

  it("returns undefined for unparseable text", () => {
    expect(coerceValueForColumn(dateCol, "not a date")).toBeUndefined();
  });
});

describe("coerceValueForColumn — enum", () => {
  it("matches by exact value", () => {
    expect(coerceValueForColumn(enumCol, "shipped")).toEqual({ value: "shipped" });
  });

  it("matches by label, case-insensitively — the likely shape of a real paste from Excel/Sheets", () => {
    expect(coerceValueForColumn(enumCol, "Shipped")).toEqual({ value: "shipped" });
    expect(coerceValueForColumn(enumCol, "SHIPPED")).toEqual({ value: "shipped" });
  });

  it("returns undefined for a value matching neither a value nor a label", () => {
    expect(coerceValueForColumn(enumCol, "delivered")).toBeUndefined();
  });
});

describe("coerceValueForColumn — Excel error strings", () => {
  it("skips (returns undefined) a formula-error string pasted into a non-string column", () => {
    expect(coerceValueForColumn(numberCol, "#N/A")).toBeUndefined();
    expect(coerceValueForColumn(currencyCol, "#DIV/0!")).toBeUndefined();
    expect(coerceValueForColumn(dateCol, "#REF!")).toBeUndefined();
    expect(coerceValueForColumn(booleanCol, "#VALUE!")).toBeUndefined();
    expect(coerceValueForColumn(enumCol, "#NAME?")).toBeUndefined();
  });

  it("still accepts a formula-error string verbatim into a string column", () => {
    expect(coerceValueForColumn(stringCol, "#N/A")).toEqual({ value: "#N/A" });
  });
});

describe("coerceValueForColumn — Swiss-formatted numbers", () => {
  it("parses a Swiss-grouped number with an apostrophe thousands separator", () => {
    expect(coerceValueForColumn(numberCol, "1'234")).toEqual({ value: 1234 });
    expect(coerceValueForColumn(numberCol, "1'234'567.89")).toEqual({ value: 1234567.89 });
  });

  it("parses a Swiss franc currency cell with a CHF/Fr. marker", () => {
    expect(coerceValueForColumn(currencyCol, "CHF 1'234.50")).toEqual({ value: 1234.5 });
    expect(coerceValueForColumn(currencyCol, "1'234.50 Fr.")).toEqual({ value: 1234.5 });
  });
});
