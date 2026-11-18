import { describe, expect, it } from "vitest";
import { createTranslate, formatMessage, interpolate, resolveLanguage } from "../../src/i18n/messages";

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

  it("lower-cases only the first letter with {name:inline}, unless the value starts with an acronym", () => {
    expect(interpolate("Filtrer par {h:inline}", { h: "Statut client" })).toBe("Filtrer par statut client");
    expect(interpolate("{h:inline}", { h: "L12M Sales" })).toBe("L12M Sales");
    expect(interpolate("{h:inline}", { h: "EK" })).toBe("EK");
    expect(interpolate("{h:inline}", { h: "X" })).toBe("X");
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
    expect(createTranslate("de")("pagination.next")).toBe("Weiter");
    expect(createTranslate("fr")("combobox.selectedCount", { count: 0 })).toBe("0 sélectionné");
    expect(createTranslate("fr")("combobox.selectedCount", { count: 3 })).toBe("3 sélectionnés");
    expect(createTranslate("en")("filterSheet.applyWithCount", { count: 1 })).toBe("Show 1 result");
  });
});
