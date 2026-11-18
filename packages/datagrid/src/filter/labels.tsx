import type { Locale } from "date-fns";
import type { ReactElement, ReactNode } from "react";
import type { FilterOperator } from "./types";
import { createContext, useContext, useMemo } from "react";
import { getI18n, useIntegratedI18n } from "../i18n/locale";
import type { IntegratedI18n } from "../i18n/locale";

/**
 * Every user-facing string the built-in filter widgets (and `<DataGrid>`'s
 * own header filter trigger) render. The built-in texts of the active locale
 * (`<DataGrid locale>` / `<BmsLocaleProvider>`, English by default) apply to
 * anything you leave out; supply already-translated strings (or, for
 * templated ones, a function) to override them. See #72.
 *
 * Supply them via `<DataGrid filterLabels>`, a `<FilterLabelsProvider>`
 * around any widgets you render yourself (custom `renderFilter`,
 * `renderHeader`, standalone use), or a single widget's own `labels` prop —
 * innermost wins, each merged over the one outside it.
 */
export interface FilterLabels {
  /** Accessible name of every filter trigger button (the header funnel icon and each widget's own `bare={false}` trigger). */
  filterAriaLabel: (header: string) => string;
  /** Close button of the column filter modal shown on mobile (below 768px). */
  filterDone: string;

  // --- EnumFilter ---
  /** EnumFilter search input placeholder. */
  searchPlaceholder: (header: string) => string;
  /** EnumFilter "Select all" checkbox label (acts on the currently visible options). */
  selectAll: string;
  /** Accessible name of an EnumFilter group header's tri-state checkbox. */
  selectAllOfGroup: (group: string) => string;
  /** EnumFilter empty-search message. */
  noMatches: string;
  /** EnumFilter `bare={false}` trigger summary once something is selected. */
  selectedCount: (count: number) => string;
  /** EnumFilter `allowExclude` toggle: include mode (`in`). */
  enumIsAnyOf: string;
  /** EnumFilter `allowExclude` toggle: exclude mode (`notIn`). */
  enumIsNoneOf: string;
  /** EnumFilter hint under a list capped at 300 rows. */
  moreOptions: (hiddenCount: number) => string;

  // --- ActiveFilterBar ---
  /** The operator word in a chip ("Status is any of Open"). */
  operatorLabel: (operator: FilterOperator) => string;
  activeFilters: (count: number) => string;
  noActiveFilters: string;
  noActiveFiltersHint: string;
  clearAllFilters: string;
  moreFilters: (hiddenCount: number) => string;
  /** Accessible name of a chip's × button; `text` is the whole chip text. */
  removeFilter: (text: string) => string;

  // --- StringFilter ---
  stringPlaceholder: (header: string) => string;
  stringContains: string;
  stringIs: string;
  stringStartsWith: string;
  stringEndsWith: string;
  /** Accessible name of the StringFilter/NumberComparisonFilter operator dropdown. */
  operatorAriaLabel: (header: string) => string;

  // --- BooleanFilter ---
  booleanAll: string;
  booleanYes: string;
  booleanNo: string;
  /** Accessible name of the BooleanFilter select. */
  booleanAriaLabel: (header: string) => string;

  // --- NumberRangeFilter / NumberComparisonFilter / NumberHistogramFilter ---
  minPlaceholder: string;
  maxPlaceholder: string;
  valuePlaceholder: string;
  /** The small word between the min and max inputs. */
  rangeSeparator: string;
  minimumAriaLabel: (header: string) => string;
  maximumAriaLabel: (header: string) => string;
  minimumSliderAriaLabel: (header: string) => string;
  maximumSliderAriaLabel: (header: string) => string;
  numberGreaterThan: string;
  numberGreaterThanOrEqual: string;
  numberLessThan: string;
  numberLessThanOrEqual: string;
  numberEquals: string;
  numberNotEquals: string;
  numberBetween: string;
  /** NumberHistogramFilter's clear button. */
  clear: string;
  /** NumberHistogramFilter's `loadValues` in-flight message. */
  loading: string;
  /** NumberHistogramFilter: `loadValues` rejected. */
  loadFailed: string;
  /** NumberHistogramFilter: retry action next to `loadFailed`. */
  retry: string;

  // --- DateRangeFilter ---
  dateToday: string;
  dateLast7Days: string;
  dateThisMonth: string;
  dateCustom: string;
  /**
   * date-fns locale for DateRangeFilter's calendar (month/weekday names,
   * first day of week) and its trigger summary. Unset keeps date-fns'/
   * react-day-picker's own default (en-US), exactly as before.
   */
  dateLocale?: Locale;
}

/** The built-in `FilterLabels` of one locale. */
export function filterLabelsFor({ t, dateLocale }: IntegratedI18n): FilterLabels {
  return {
    filterAriaLabel: (header) => t("filter.filterAriaLabel", { header }),
    filterDone: t("filter.filterDone"),

    searchPlaceholder: (header) => t("filter.searchPlaceholder", { header }),
    selectAll: t("filter.selectAll"),
    selectAllOfGroup: (group) => t("filter.selectAllOfGroup", { group }),
    noMatches: t("filter.noMatches"),
    selectedCount: (count) => t("filter.selectedCount", { count }),
    enumIsAnyOf: t("filter.enumIsAnyOf"),
    enumIsNoneOf: t("filter.enumIsNoneOf"),
    moreOptions: (hiddenCount) => t("filter.moreOptions", { count: hiddenCount }),

    operatorLabel: (operator) => t(`filter.operator.${operator}`),
    activeFilters: (count) => t("filter.activeFilters", { count }),
    noActiveFilters: t("filter.noActiveFilters"),
    noActiveFiltersHint: t("filter.noActiveFiltersHint"),
    clearAllFilters: t("filter.clearAllFilters"),
    moreFilters: (hiddenCount) => t("filter.moreFilters", { count: hiddenCount }),
    removeFilter: (text) => t("filter.removeFilter", { text }),

    stringPlaceholder: (header) => t("filter.stringPlaceholder", { header }),
    stringContains: t("filter.stringContains"),
    stringIs: t("filter.stringIs"),
    stringStartsWith: t("filter.stringStartsWith"),
    stringEndsWith: t("filter.stringEndsWith"),
    operatorAriaLabel: (header) => t("filter.operatorAriaLabel", { header }),

    booleanAll: t("filter.booleanAll"),
    booleanYes: t("filter.booleanYes"),
    booleanNo: t("filter.booleanNo"),
    booleanAriaLabel: (header) => t("filter.booleanAriaLabel", { header }),

    minPlaceholder: t("filter.minPlaceholder"),
    maxPlaceholder: t("filter.maxPlaceholder"),
    valuePlaceholder: t("filter.valuePlaceholder"),
    rangeSeparator: t("filter.rangeSeparator"),
    minimumAriaLabel: (header) => t("filter.minimumAriaLabel", { header }),
    maximumAriaLabel: (header) => t("filter.maximumAriaLabel", { header }),
    minimumSliderAriaLabel: (header) => t("filter.minimumSliderAriaLabel", { header }),
    maximumSliderAriaLabel: (header) => t("filter.maximumSliderAriaLabel", { header }),
    numberGreaterThan: t("filter.numberGreaterThan"),
    numberGreaterThanOrEqual: t("filter.numberGreaterThanOrEqual"),
    numberLessThan: t("filter.numberLessThan"),
    numberLessThanOrEqual: t("filter.numberLessThanOrEqual"),
    numberEquals: t("filter.numberEquals"),
    numberNotEquals: t("filter.numberNotEquals"),
    numberBetween: t("filter.numberBetween"),
    clear: t("filter.clear"),
    loading: t("filter.loading"),
    loadFailed: t("filter.loadFailed"),
    retry: t("filter.retry"),

    dateToday: t("filter.dateToday"),
    dateLast7Days: t("filter.dateLast7Days"),
    dateThisMonth: t("filter.dateThisMonth"),
    dateCustom: t("filter.dateCustom"),
    dateLocale,
  };
}

/** English defaults — byte-for-byte the strings every widget rendered before `FilterLabels` existed. */
export const defaultFilterLabels: FilterLabels = filterLabelsFor(getI18n("en"));

const builtInCache = new WeakMap<IntegratedI18n, FilterLabels>();

function builtInFilterLabels(i18n: IntegratedI18n): FilterLabels {
  let labels = builtInCache.get(i18n);
  if (!labels) {
    labels = filterLabelsFor(i18n);
    builtInCache.set(i18n, labels);
  }
  return labels;
}

/** Merges `overrides` over `base`, ignoring keys explicitly set to `undefined` (so `{ selectAll: maybeT }` never blanks a default). */
export function mergeFilterLabels(base: FilterLabels, overrides: Partial<FilterLabels> | undefined): FilterLabels {
  return mergeDefined(base, overrides);
}

function mergeDefined<T extends object>(base: T, overrides: Partial<T> | undefined): T {
  if (!overrides) return base;
  const merged: Record<string, unknown> = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) merged[key] = value;
  }
  return merged as T;
}

// The overrides of the enclosing providers, merged; the built-in texts of the active locale sit underneath at read time.
const FilterLabelsContext = createContext<Partial<FilterLabels> | undefined>(undefined);

/**
 * Supplies `labels` to every filter widget below it, merged over any
 * enclosing provider's (or the built-in texts of the active locale, English
 * unless a `locale` is set). `<DataGrid filterLabels>` renders one of these
 * itself; use it directly around widgets you render outside a `<DataGrid>`.
 */
export function FilterLabelsProvider({
  labels,
  children,
}: {
  labels: Partial<FilterLabels> | undefined;
  children: ReactNode;
}): ReactElement {
  const parent = useContext(FilterLabelsContext);
  const value = useMemo(() => mergeDefined<Partial<FilterLabels>>(parent ?? {}, labels), [parent, labels]);
  return <FilterLabelsContext.Provider value={value}>{children}</FilterLabelsContext.Provider>;
}

/** The effective labels here: locale texts, then the providers' overrides, then an optional per-widget `overrides` on top. */
export function useFilterLabels(overrides?: Partial<FilterLabels>): FilterLabels {
  const i18n = useIntegratedI18n();
  const fromContext = useContext(FilterLabelsContext);
  return useMemo(
    () => mergeFilterLabels(mergeFilterLabels(builtInFilterLabels(i18n), fromContext), overrides),
    [i18n, fromContext, overrides],
  );
}
