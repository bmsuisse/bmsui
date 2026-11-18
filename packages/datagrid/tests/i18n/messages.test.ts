import { describe, expect, it } from "vitest";
import { createTranslate, dateLocaleFor, formatMessage, interpolate, resolveLanguage } from "../../src/i18n/messages";

describe("resolveLanguage", () => {
  it("takes the language of a BCP 47 tag", () => {
    expect(resolveLanguage("de-CH")).toBe("de");
    expect(resolveLanguage("fr_CH")).toBe("fr");
    expect(resolveLanguage("IT")).toBe("it");
    expect(resolveLanguage("nl-BE")).toBe("nl");
    expect(resolveLanguage("es-419")).toBe("es");
  });

  it("falls back to English", () => {
    expect(resolveLanguage(undefined)).toBe("en");
    expect(resolveLanguage("")).toBe("en");
    expect(resolveLanguage("pt-BR")).toBe("en");
  });
});

describe("interpolate", () => {
  it("fills placeholders and leaves unknown ones alone", () => {
    expect(interpolate("{a} and {b}", { a: "x", b: 2 })).toBe("x and 2");
    expect(interpolate("{a} {missing}", { a: "x" })).toBe("x {missing}");
    expect(interpolate("{a}", undefined)).toBe("{a}");
  });

  it("lower-cases with {name:lower}", () => {
    expect(interpolate("Search {header:lower}...", { header: "Customer NAME" })).toBe("Search customer name...");
  });

  it("does not re-expand placeholders inside values", () => {
    expect(interpolate("{a}", { a: "{b}", b: "x" })).toBe("{b}");
  });
});

describe("formatMessage", () => {
  const message = { one: "{count} item", other: "{count} items" };

  it("picks the plural form by the language's rules", () => {
    expect(formatMessage(message, "en", { count: 1 })).toBe("1 item");
    expect(formatMessage(message, "en", { count: 0 })).toBe("0 items");
    expect(formatMessage(message, "en", { count: 2 })).toBe("2 items");
  });

  it("treats 0 as singular in French", () => {
    expect(formatMessage(message, "fr", { count: 0 })).toBe("0 item");
    expect(formatMessage(message, "fr", { count: 1 })).toBe("1 item");
    expect(formatMessage(message, "fr", { count: 2 })).toBe("2 items");
  });

  it("falls back to other for a category the message does not spell out", () => {
    expect(formatMessage({ other: "{count} x" }, "en", { count: 1 })).toBe("1 x");
  });

  it("uses other without a numeric count", () => {
    expect(formatMessage(message, "en", {})).toBe("{count} items");
  });

  it("passes a plain string through", () => {
    expect(formatMessage("Hi {name}", "de", { name: "Ada" })).toBe("Hi Ada");
  });
});

describe("createTranslate", () => {
  it("translates with the language's catalog", () => {
    expect(createTranslate("de")("filter.selectAll")).toBe("Alle auswählen");
    expect(createTranslate("fr")("filter.selectedCount", { count: 0 })).toBe("0 sélectionné");
    expect(createTranslate("fr")("filter.selectedCount", { count: 3 })).toBe("3 sélectionnés");
    expect(createTranslate("en")("editing.save", { count: 1 })).toBe("Save 1 change");
  });
});

describe("dateLocaleFor", () => {
  it("is undefined for plain English", () => {
    expect(dateLocaleFor("en")).toBeUndefined();
    expect(dateLocaleFor("en-US")).toBeUndefined();
    expect(dateLocaleFor("pt")).toBeUndefined();
  });

  it("picks the Swiss variants where date-fns has them", () => {
    expect(dateLocaleFor("de-CH")?.code).toBe("de");
    expect(dateLocaleFor("fr")?.code).toBe("fr");
    expect(dateLocaleFor("fr-CH")?.code).toBe("fr-CH");
    expect(dateLocaleFor("it-CH")?.code).toBe("it-CH");
    expect(dateLocaleFor("nl")?.code).toBe("nl");
    expect(dateLocaleFor("es")?.code).toBe("es");
    expect(dateLocaleFor("en-GB")?.code).toBe("en-GB");
  });
});
