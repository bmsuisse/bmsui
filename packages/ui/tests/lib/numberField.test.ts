import { describe, expect, it } from "vitest";
import { numberSymbols } from "../../src/lib/numberField";
import { addPrecise, decimalPlaces, formatLocaleNumber, parseLocaleNumber, roundTo } from "../../src/lib/numberField";

// ICU versions differ on the Swiss group mark (' vs ’).
const G = numberSymbols("de-CH").group;

describe("parseLocaleNumber", () => {
  it.each([
    ["1234.5", "de-CH", 1234.5],
    ["1234,5", "de-CH", 1234.5],
    ["1'234.50", "de-CH", 1234.5],
    ["1’234.50", "de-CH", 1234.5],
    ["1 234", "de-CH", 1234],
    ["1'234'567", "de-CH", 1234567],
    ["-12,25", "de-CH", -12.25],
    ["−3", "de-CH", -3],
    ["+7", "de-CH", 7],
    [".5", "de-CH", 0.5],
    ["1,234.56", "en-US", 1234.56],
    ["1.234,56", "de-DE", 1234.56],
    ["1,234", "en-US", 1234],
    ["1.234", "de-DE", 1234],
    ["1.234", "de-CH", 1.234],
    ["1,5", "de-DE", 1.5],
    ["1.234.567", "de-DE", 1234567],
  ])("%s in %s -> %s", (text, locale, expected) => {
    expect(parseLocaleNumber(text, locale)).toBe(expected);
  });

  it.each(["", "abc", "1.2.3", "1,23,4", "12a", "1.234,5.6", "--1"])("rejects %j", (text) => {
    expect(parseLocaleNumber(text, "de-CH")).toBeNull();
  });
});

describe("formatLocaleNumber", () => {
  it("groups in the locale and honours decimals", () => {
    expect(formatLocaleNumber(1234.5, "de-CH", { decimals: 2 })).toBe(`1${G}234.50`);
    expect(formatLocaleNumber(1234.5, "de-DE")).toBe("1.234,5");
    expect(formatLocaleNumber(null, "de-CH")).toBe("");
    expect(formatLocaleNumber(1234, "de-CH", { formatOptions: { useGrouping: false } })).toBe("1234");
  });
});

describe("float-safe stepping", () => {
  it("adds without float noise", () => {
    expect(addPrecise(0.1, 0.2)).toBe(0.3);
    expect(addPrecise(1.15, -0.05)).toBe(1.1);
    expect(decimalPlaces(1e-7)).toBe(7);
  });
});

describe("review fixes: formatted displays, Swiss dash, rounding", () => {
  it("reads its own currency / unit / percent display back", () => {
    const chf = { style: "currency", currency: "CHF" } as const;
    const kg = { style: "unit", unit: "kilogram" } as const;
    const pct = { style: "percent" } as const;
    expect(parseLocaleNumber(formatLocaleNumber(1234.5, "de-CH", { formatOptions: chf }), "de-CH", chf)).toBe(1234.5);
    expect(parseLocaleNumber(formatLocaleNumber(-1234.5, "de-CH", { formatOptions: chf }), "de-CH", chf)).toBe(-1234.5);
    expect(parseLocaleNumber(formatLocaleNumber(1234.5, "de-CH", { formatOptions: kg }), "de-CH", kg)).toBe(1234.5);
    expect(parseLocaleNumber(formatLocaleNumber(1234.5, "de-CH", { formatOptions: pct }), "de-CH", pct)).toBe(1234.5);
    expect(parseLocaleNumber("12%", "de-CH", pct)).toBe(0.12);
    expect(parseLocaleNumber("%", "de-CH", pct)).toBeNull();
  });

  it("reads Swiss whole amounts 50.- and 50.–", () => {
    expect(parseLocaleNumber("50.-", "de-CH")).toBe(50);
    expect(parseLocaleNumber("50.–", "de-CH")).toBe(50);
    expect(parseLocaleNumber("1'250.–", "de-CH")).toBe(1250);
    expect(parseLocaleNumber("-50.-", "de-CH")).toBe(-50);
  });

  it("rounds on the written decimals (1.005 -> 1.01)", () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(-1.005, 2)).toBe(-1.01);
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(roundTo(1234.5, 0)).toBe(1235);
    expect(roundTo(1e-7, 2)).toBe(0);
  });
});
