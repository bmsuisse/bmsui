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

const PLACEHOLDER = /\{(\w+)(?::(lower|inline))?\}/g;

/**
 * Lower-cases the first letter of a column header for mid-sentence use
 * ("Filtrer par statut"), unless it starts with an acronym or code ("EK",
 * "L12M Sales" stay as they are).
 */
function inlineHeader(value: string): string {
  const second = value[1];
  if (value.length < 2 || second === undefined || second === second.toUpperCase()) return value;
  return value[0]!.toLowerCase() + value.slice(1);
}

/**
 * Fills `{name}` placeholders; an unknown name is left as written.
 * `{name:lower}` lower-cases the whole value (English "Search status..."),
 * `{name:inline}` only its first letter, acronym-aware (fr/it/es).
 */
export function interpolate(template: string, params: MessageParams | undefined): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (whole, name: string, modifier: string | undefined) => {
    const value = params[name];
    if (value === undefined) return whole;
    const text = String(value);
    return modifier === "lower" ? text.toLowerCase() : modifier === "inline" ? inlineHeader(text) : text;
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
