import type { Locale } from "date-fns";
import { createContext, useContext, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { createTranslate, dateLocaleFor, resolveLanguage } from "./messages";
import type { BmsLanguage, Translate } from "./messages";

/** What a component needs to render in the active locale. */
export interface IntegratedI18n {
  /** The BCP 47 tag as given (`"de-CH"`) — use it for `Intl` number/date formatting. */
  locale: string;
  /** The built-in language the texts come from; `"en"` for a tag without built-in texts. */
  language: BmsLanguage;
  /** Looks up a built-in text, filling `{placeholders}` and picking the plural form for `count`. */
  t: Translate;
  /** date-fns locale of the calendar; `undefined` for plain English (react-day-picker's own default). */
  dateLocale: Locale | undefined;
}

const cache = new Map<string, IntegratedI18n>();

/** One stable object per tag, so context consumers don't re-render when a parent re-renders. */
export function getI18n(locale: string): IntegratedI18n {
  let i18n = cache.get(locale);
  if (!i18n) {
    const language = resolveLanguage(locale);
    i18n = { locale, language, t: createTranslate(language, locale), dateLocale: dateLocaleFor(locale) };
    cache.set(locale, i18n);
  }
  return i18n;
}

/** No provider and no `locale` prop: English, exactly as before locales existed. */
const DEFAULT_I18N: IntegratedI18n = getI18n("en");

const BmsLocaleContext = createContext<IntegratedI18n>(DEFAULT_I18N);

/**
 * Sets the language of every datagrid text below it, from the built-in
 * translations (de, fr, it, en, nl, es). Region variants (`"de-CH"`) pick
 * the language and keep the region for number/date formatting. A
 * `locale` prop on `<DataGrid>`/`<TreeDataGrid>` overrides it for that grid.
 * Explicit overrides (`filterLabels`, `statusLabels`, …) still win.
 */
export function BmsLocaleProvider({ locale, children }: { locale: string; children: ReactNode }): ReactElement {
  const value = useMemo(() => getI18n(locale), [locale]);
  return <BmsLocaleContext.Provider value={value}>{children}</BmsLocaleContext.Provider>;
}

/** The active locale: `locale` when given (a grid's own prop), else the nearest `<BmsLocaleProvider>`, else English. */
export function useIntegratedI18n(locale?: string): IntegratedI18n {
  const fromContext = useContext(BmsLocaleContext);
  return locale === undefined ? fromContext : getI18n(locale);
}
