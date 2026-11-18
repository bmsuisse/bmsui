import type { Locale } from "date-fns";
import { de as dateFnsDe } from "date-fns/locale/de";
import { enGB as dateFnsEnGB } from "date-fns/locale/en-GB";
import { es as dateFnsEs } from "date-fns/locale/es";
import { fr as dateFnsFr } from "date-fns/locale/fr";
import { frCH as dateFnsFrCH } from "date-fns/locale/fr-CH";
import { it as dateFnsIt } from "date-fns/locale/it";
import { itCH as dateFnsItCH } from "date-fns/locale/it-CH";
import { nl as dateFnsNl } from "date-fns/locale/nl";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";

/** Plural categories a message can spell out; `other` is mandatory and the fallback. */
export type PluralMessage = { other: string } & Partial<Record<Exclude<Intl.LDMLPluralRule, "other">, string>>;
export type Message = string | PluralMessage;

/** Every translatable key — the keys of `locales/en.json`, the source of truth. */
export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, Message>;

export const LANGUAGES = ["de", "fr", "it", "en", "nl", "es"] as const;
/** Languages with built-in texts. */
export type BmsLanguage = (typeof LANGUAGES)[number];

// Assigning each JSON to `Messages` makes a missing key a compile error; `tests/i18n` checks the rest at runtime.
export const CATALOGS: Record<BmsLanguage, Messages> = { de, fr, it, en, nl, es };

export type MessageParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: MessageParams) => string;

/**
 * The language of a BCP 47 tag (`"de-CH"` -> `"de"`), `"en"` for anything
 * without built-in texts. Matching is case-insensitive and accepts `_`.
 */
export function resolveLanguage(tag: string | undefined): BmsLanguage {
  const language = tag?.split(/[-_]/)[0]?.toLowerCase();
  return LANGUAGES.find((candidate) => candidate === language) ?? "en";
}

const PLACEHOLDER = /\{(\w+)(?::(lower))?\}/g;

/** Fills `{name}` (and `{name:lower}`, lower-cased for mid-sentence use) placeholders; an unknown name is left as written. */
export function interpolate(template: string, params: MessageParams | undefined): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (whole, name: string, modifier: string | undefined) => {
    const value = params[name];
    if (value === undefined) return whole;
    return modifier === "lower" ? String(value).toLowerCase() : String(value);
  });
}

const pluralRulesCache = new Map<string, Intl.PluralRules>();

function pluralRules(tag: string): Intl.PluralRules {
  let rules = pluralRulesCache.get(tag);
  if (!rules) {
    try {
      rules = new Intl.PluralRules(tag);
    } catch {
      rules = new Intl.PluralRules("en");
    }
    pluralRulesCache.set(tag, rules);
  }
  return rules;
}

/** Picks the plural form of `message` for `params.count` in `tag`'s rules (fr: 0 and 1 are singular); a plain string passes through. */
export function formatMessage(message: Message, tag: string, params?: MessageParams): string {
  if (typeof message === "string") return interpolate(message, params);
  const count = params?.count;
  const category = typeof count === "number" ? pluralRules(tag).select(count) : "other";
  return interpolate(message[category] ?? message.other, params);
}

/** A `t` bound to one language's catalog; `tag` (default: the language) only steers plural rules. */
export function createTranslate(language: BmsLanguage, tag: string = language): Translate {
  const catalog = CATALOGS[language];
  return (key, params) => formatMessage(catalog[key], tag, params);
}

/**
 * date-fns locale for the calendar of a locale tag, with the Swiss variants
 * (`fr-CH`, `it-CH`) where date-fns has them. `undefined` for plain English,
 * which keeps react-day-picker's own default (en-US).
 */
export function dateLocaleFor(tag: string): Locale | undefined {
  const [language, region] = tag.split(/[-_]/).map((part) => part.toLowerCase());
  const swiss = region === "ch";
  switch (resolveLanguage(tag)) {
    case "de":
      return dateFnsDe;
    case "fr":
      return swiss ? dateFnsFrCH : dateFnsFr;
    case "it":
      return swiss ? dateFnsItCH : dateFnsIt;
    case "nl":
      return dateFnsNl;
    case "es":
      return dateFnsEs;
    case "en":
      return language === "en" && region === "gb" ? dateFnsEnGB : undefined;
  }
}
