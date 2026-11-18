import { describe, expect, it } from "vitest";
import { CATALOGS, LANGUAGES } from "../../src/i18n/messages";
import type { Message, MessageKey } from "../../src/i18n/messages";

const keys = Object.keys(CATALOGS.en) as MessageKey[];

function texts(message: Message): string[] {
  return typeof message === "string" ? [message] : Object.values(message);
}

function placeholders(message: Message): string[] {
  const names = new Set<string>();
  for (const text of texts(message)) for (const match of text.matchAll(/\{(\w+)(?::\w+)?\}/g)) names.add(match[1]!);
  return [...names].sort();
}

describe("built-in catalogs", () => {
  it("covers every language", () => {
    expect(Object.keys(CATALOGS).sort()).toEqual([...LANGUAGES].sort());
  });

  for (const language of LANGUAGES) {
    describe(language, () => {
      it("has exactly the keys of en.json", () => {
        expect(Object.keys(CATALOGS[language]).sort()).toEqual([...keys].sort());
      });

      it("has no empty text", () => {
        for (const key of keys) for (const text of texts(CATALOGS[language][key])) expect(text, key).not.toBe("");
      });

      // A language may leave a placeholder out (fr/it/de search placeholders drop `{header}` on purpose: the column
      // name is right above the popover and a long one gets truncated), but never invent one the code doesn't pass.
      it("uses no placeholder that en.json lacks, and keeps {count} wherever en.json has it", () => {
        for (const key of keys) {
          const own = placeholders(CATALOGS[language][key]);
          const source = placeholders(CATALOGS.en[key]);
          expect(source, key).toEqual(expect.arrayContaining(own));
          if (source.includes("count")) expect(own, key).toContain("count");
        }
      });

      it("spells out plural messages with categories the language has", () => {
        const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories;
        for (const key of keys) {
          const message = CATALOGS[language][key];
          if (typeof message === "string") continue;
          expect(message.other, key).toBeTruthy();
          for (const category of Object.keys(message)) expect(categories, `${key}.${category}`).toContain(category);
          // "other" alone would render "1 sélectionnés" for a language that distinguishes "one".
          if (categories.includes("one")) expect(message.one, key).toBeTruthy();
        }
      });
    });
  }
});
