import { createContext, useContext, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { createTranslate, resolveLanguage } from "./messages";
import type { BmsLanguage, MessageKey, MessageParams, Translate } from "./messages";

/** What a component needs to render in the active locale. */
export interface IntegratedI18n {
  /** The BCP 47 tag as given (`"de-CH"`) — use it for `Intl` number/date formatting. */
  locale: string;
  /** The built-in language the texts come from; `"en"` for a tag without built-in texts. */
  language: BmsLanguage;
  /** Looks up a built-in text, filling `{placeholders}` and picking the plural form for `count`. */
  t: Translate;
  /** `false` without a `<BmsLocaleProvider>` (or `locale` prop): English texts, Swiss-German number/date formats. */
  explicit: boolean;
}

const cache = new Map<string, IntegratedI18n>();

/** One stable object per tag, so context consumers don't re-render when a parent re-renders. */
export function getI18n(locale: string, explicit = true): IntegratedI18n {
  const key = `${explicit ? "1" : "0"}${locale}`;
  let i18n = cache.get(key);
  if (!i18n) {
    const language = resolveLanguage(locale);
    i18n = { locale, language, t: createTranslate(language, locale), explicit };
    cache.set(key, i18n);
  }
  return i18n;
}

/** No provider: English texts, exactly as before locales existed. */
const DEFAULT_I18N: IntegratedI18n = getI18n("en", false);

const BmsLocaleContext = createContext<IntegratedI18n>(DEFAULT_I18N);

/**
 * Sets the language of every text of `@bmsuisse/ui` components below it, from
 * the built-in translations (de, fr, it, en, nl, es). Region variants
 * (`"de-CH"`) pick the language and keep the region for the number/date
 * formatting that components do when their own `locale` prop is unset.
 * `labels` props and text props (`confirmLabel`, `placeholder`, …) still win.
 */
export function BmsLocaleProvider({ locale, children }: { locale: string; children: ReactNode }): ReactElement {
  const value = useMemo(() => getI18n(locale), [locale]);
  return <BmsLocaleContext.Provider value={value}>{children}</BmsLocaleContext.Provider>;
}

/** The active locale: `locale` when given (a component's own prop), else the nearest `<BmsLocaleProvider>`, else English. */
export function useIntegratedI18n(locale?: string): IntegratedI18n {
  const fromContext = useContext(BmsLocaleContext);
  return locale === undefined ? fromContext : getI18n(locale);
}

/**
 * The BCP 47 tag for number/date formatting: the component's own `locale`
 * prop, else the `<BmsLocaleProvider>`'s, else `"de-CH"` (the package default
 * since before translations existed).
 */
export function useFormatLocale(locale?: string): string {
  const fromContext = useContext(BmsLocaleContext);
  return locale ?? (fromContext.explicit ? fromContext.locale : "de-CH");
}

const labelCache = new WeakMap<object, WeakMap<IntegratedI18n, unknown>>();

function builtInLabels<L>(factory: (i18n: IntegratedI18n) => L, i18n: IntegratedI18n): L {
  let perLocale = labelCache.get(factory);
  if (!perLocale) {
    perLocale = new WeakMap();
    labelCache.set(factory, perLocale);
  }
  if (!perLocale.has(i18n)) perLocale.set(i18n, factory(i18n));
  return perLocale.get(i18n) as L;
}

/**
 * The effective labels of a component: the built-in texts of the active
 * locale (`factory`, e.g. `paginationLabelsFor`), with the caller's `labels`
 * prop merged on top. Keys passed as `undefined` never blank a text.
 */
export function useLabels<L extends object>(factory: (i18n: IntegratedI18n) => L, overrides?: Partial<L>): L {
  const i18n = useIntegratedI18n();
  const base = builtInLabels(factory, i18n);
  return useMemo(() => {
    if (!overrides) return base;
    const merged = { ...base } as Record<string, unknown>;
    for (const [key, value] of Object.entries(overrides)) if (value !== undefined) merged[key] = value;
    return merged as L;
  }, [base, overrides]);
}

/** Renders one built-in text, for spots without a good place for a hook (e.g. a screen-reader-only "Close" inside a primitive). */
export function I18nText({ k, params }: { k: MessageKey; params?: MessageParams }): ReactElement {
  return <>{useIntegratedI18n().t(k, params)}</>;
}
