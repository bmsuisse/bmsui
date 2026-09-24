import type { Locale } from "date-fns";
import type { ReactElement, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

/**
 * Every user-facing string the built-in filter widgets (and `<DataGrid>`'s
 * own header filter trigger) render. This package has no translation/i18n
 * layer — same convention as `EditingOptions.saveLabel`/`discardLabel`:
 * you supply already-translated strings (or, for templated ones, a
 * function) and the English defaults in `defaultFilterLabels` apply to
 * anything you leave out. See #72.
 *
 * Supply them via `<DataGrid filterLabels>`, a `<FilterLabelsProvider>`
 * around any widgets you render yourself (custom `renderFilter`,
 * `renderHeader`, standalone use), or a single widget's own `labels` prop —
 * innermost wins, each merged over the one outside it.
 */
export interface FilterLabels {
  /** Accessible name of every filter trigger button (the header funnel icon and each widget's own `bare={false}` trigger). */
  filterAriaLabel: (header: string) => string;

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

/** English defaults — byte-for-byte the strings every widget rendered before `FilterLabels` existed. */
export const defaultFilterLabels: FilterLabels = {
  filterAriaLabel: (header) => `Filter ${header}`,

  searchPlaceholder: (header) => `Search ${header.toLowerCase()}...`,
  selectAll: "Select all",
  selectAllOfGroup: (group) => `Select all of ${group}`,
  noMatches: "No matches.",
  selectedCount: (count) => `${count} selected`,

  stringPlaceholder: (header) => `Filter ${header.toLowerCase()}...`,
  stringContains: "Contains",
  stringIs: "Is",
  stringStartsWith: "Starts with",
  stringEndsWith: "Ends with",
  operatorAriaLabel: (header) => `${header} filter operator`,

  booleanAll: "All",
  booleanYes: "Yes",
  booleanNo: "No",
  booleanAriaLabel: (header) => `${header} filter`,

  minPlaceholder: "Min",
  maxPlaceholder: "Max",
  valuePlaceholder: "Value",
  rangeSeparator: "to",
  minimumAriaLabel: (header) => `${header} minimum`,
  maximumAriaLabel: (header) => `${header} maximum`,
  minimumSliderAriaLabel: (header) => `${header} minimum (slider)`,
  maximumSliderAriaLabel: (header) => `${header} maximum (slider)`,
  numberGreaterThan: "Greater than",
  numberGreaterThanOrEqual: "Greater than or equal to",
  numberLessThan: "Less than",
  numberLessThanOrEqual: "Less than or equal to",
  numberEquals: "Equals",
  numberNotEquals: "Does not equal",
  numberBetween: "Between",
  clear: "Clear",
  loading: "Loading…",

  dateToday: "Today",
  dateLast7Days: "Last 7 days",
  dateThisMonth: "This month",
  dateCustom: "Custom",
};

/** Merges `overrides` over `base`, ignoring keys explicitly set to `undefined` (so `{ selectAll: maybeT }` never blanks a default). */
export function mergeFilterLabels(base: FilterLabels, overrides: Partial<FilterLabels> | undefined): FilterLabels {
  if (!overrides) return base;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) merged[key] = value;
  }
  return merged as unknown as FilterLabels;
}

const FilterLabelsContext = createContext<FilterLabels>(defaultFilterLabels);

/**
 * Supplies `labels` to every filter widget below it, merged over any
 * enclosing provider's (or the English defaults). `<DataGrid filterLabels>`
 * renders one of these itself; use it directly around widgets you render
 * outside a `<DataGrid>`.
 */
export function FilterLabelsProvider({
  labels,
  children,
}: {
  labels: Partial<FilterLabels> | undefined;
  children: ReactNode;
}): ReactElement {
  const parent = useContext(FilterLabelsContext);
  const value = useMemo(() => mergeFilterLabels(parent, labels), [parent, labels]);
  return <FilterLabelsContext.Provider value={value}>{children}</FilterLabelsContext.Provider>;
}

/** The effective labels here: context (or defaults), with an optional per-widget `overrides` merged on top. */
export function useFilterLabels(overrides?: Partial<FilterLabels>): FilterLabels {
  const fromContext = useContext(FilterLabelsContext);
  return useMemo(() => mergeFilterLabels(fromContext, overrides), [fromContext, overrides]);
}
