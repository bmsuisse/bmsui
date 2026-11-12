import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { type ReactElement, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { Combobox } from "../combobox/Combobox";
import { Checkbox } from "../../primitives/checkbox";
import { Input } from "../../primitives/input";
import { RadioGroup, RadioGroupItem } from "../../primitives/radio-group";
import { Skeleton } from "../../primitives/skeleton";
import {
  DateRangeFacetBody,
  type FacetDateRangeConfig,
  type FacetRangeConfig,
  RangeFacetBody,
} from "./rangeFacets";

export {
  type FacetDateRangeConfig,
  type FacetRangeConfig,
  formatFacetRange,
  parseFacetRange,
} from "./rangeFacets";
import { Switch } from "../../primitives/switch";

export interface FacetOption {
  value: string;
  /** Shown instead of `value`. */
  label?: ReactNode;
  /** Number of results with this value, shown right-aligned. */
  count?: number;
  disabled?: boolean;
}

export interface FacetDefinition {
  /** Key in {@link FacetFilterValue}. */
  key: string;
  label: string;
  /** The choices. Not needed for `range`/`dateRange` facets or with `render`. */
  options?: FacetOption[];
  /**
   * `list` (default): a checkbox per option. `boolean`: a switch for the first option (its value is
   * what gets selected). `single`: radio buttons, at most one value selected; clear it with the
   * facet's Clear button. `range`: histogram/slider/typed bounds from `range`. `dateRange`: a date
   * range picker. Both store one `"low..high"` entry (see `parseFacetRange`).
   */
  type?: "list" | "boolean" | "single" | "range" | "dateRange";
  /** Bounds and display of a `type: "range"` facet. */
  range?: FacetRangeConfig;
  /** Bounds of a `type: "dateRange"` facet. */
  dateRange?: FacetDateRangeConfig;
  /** Lets the user fold this facet away (overrides the filter-wide `collapsible`). */
  collapsible?: boolean;
  /** Starts folded; only with `collapsible`. A facet with a selection is never folded on mount. */
  defaultCollapsed?: boolean;
  /** Overrides the filter-wide `maxVisible` for this facet. */
  maxVisible?: number;
  /**
   * `list` (default): checkboxes (radios for `single`). `dropdown`: the options in a searchable
   * `Combobox` instead, for facets with many values where a long list would push everything else
   * off screen. Applies to `list` and `single` facets.
   */
  display?: "list" | "dropdown";
  /**
   * More options exist on the server than `options` holds. With `onLoadMore` this shows a "Load
   * more" button under the options (after the local "Show more" has revealed them all); append the
   * next page to `options` when it's called.
   */
  hasMore?: boolean;
  /** A page is being fetched: the Load more button shows `labels.loadingMore` and is disabled. */
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /**
   * Server-driven search: called with the search text on every change (debounce it yourself) and
   * `options` is shown as given instead of being filtered locally. Implies `searchable` for lists.
   */
  onSearchChange?: (query: string) => void;
  /** Adds a search box above the options, for long lists (suppliers, brands). Filters on the option's text. */
  searchable?: boolean;
  /**
   * Replaces the built-in option list with your own control (a price range, a radio list, a
   * searchable list …) under the same heading. Selection still travels as `string[]` in the
   * `FacetFilterValue`, so reset and active counts keep working.
   */
  render?: (props: { selected: string[]; onSelectedChange: (next: string[]) => void }) => ReactNode;
}

/** Selected option values per facet key; a facet without selection has no key. */
export type FacetFilterValue = Record<string, string[]>;

export interface FacetFilterLabels {
  showMore: (hidden: number) => string;
  showLess: string;
  reset: string;
  /** Button that fetches the next page of a facet's options (see `FacetDefinition.hasMore`). */
  loadMore: string;
  /** Its text while that page loads. */
  loadingMore: string;
  /** Placeholder of a `display: "dropdown"` facet's trigger. */
  dropdownPlaceholder: (facetLabel: string) => string;
  /** Names of the typed bounds of a `range` facet. */
  rangeMin: string;
  rangeMax: string;
  /** Visible text of the per-facet clear button in a facet heading. */
  clear: string;
  /** Accessible name of that button, e.g. "Clear supplier". */
  clearFacet: (facetLabel: string) => string;
  /** Read out next to a folded facet's heading: "2 selected". */
  selectedCount: (count: number) => string;
  /** Placeholder of a `searchable` facet's search box; also its accessible name. */
  searchPlaceholder: (facetLabel: string) => string;
  /** Shown when a facet search matches nothing. */
  noMatches: string;
  /** Read out after an option's name, e.g. "42 results". Gets the count already run through `formatCount`. */
  optionCount: (count: string) => string;
}

export const defaultFacetFilterLabels: FacetFilterLabels = {
  showMore: (hidden) => `Show ${hidden} more`,
  showLess: "Show less",
  reset: "Reset filters",
  loadMore: "Load more",
  loadingMore: "Loading…",
  dropdownPlaceholder: (facetLabel) => `Select ${facetLabel.toLowerCase()}`,
  rangeMin: "Minimum",
  rangeMax: "Maximum",
  clear: "Clear",
  clearFacet: (facetLabel) => `Clear ${facetLabel.toLowerCase()}`,
  selectedCount: (count) => `${count} selected`,
  searchPlaceholder: (facetLabel) => `Search ${facetLabel.toLowerCase()}`,
  noMatches: "No matches",
  optionCount: (count) => `${count} results`,
};

/** Whether a facet has anything to show: options, a custom body, or a range/date control. */
const hasBody = (facet: FacetDefinition): boolean =>
  (facet.options?.length ?? 0) > 0 || facet.render !== undefined || facet.type === "range" || facet.type === "dateRange";

/** Number of selected options over all facets. */
export function countActiveFacets(value: FacetFilterValue): number {
  return Object.values(value).reduce((sum, selected) => sum + selected.length, 0);
}

interface SharedProps {
  /** Portal target for `dropdown` facets' popover; pass the Dialog/Sheet content element when the filter sits inside a `FilterSheet`. */
  popoverContainer?: HTMLElement | null;
  /** Every facet gets a fold-away heading (a facet's own `collapsible` wins). @default false */
  collapsible?: boolean;
  maxVisible?: number;
  formatCount?: (count: number) => string;
  labels?: Partial<FacetFilterLabels>;
}

export interface FacetGroupProps extends SharedProps {
  facet: FacetDefinition;
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  className?: string;
}

let countFormat: Intl.NumberFormat | undefined;
const defaultFormatCount = (count: number): string => (countFormat ??= new Intl.NumberFormat()).format(count);

function toggle(selected: string[], value: string, on: boolean): string[] {
  const without = selected.filter((entry) => entry !== value);
  return on ? [...without, value] : without;
}

/** One facet: heading plus its options (checkbox list, or a single switch). Used by {@link FacetFilter}; use it alone for a single filter section. */
export function FacetGroup({
  facet,
  selected,
  onSelectedChange,
  maxVisible = 8,
  popoverContainer,
  collapsible: collapsibleAll = false,
  formatCount = defaultFormatCount,
  labels: labelOverrides,
  className,
}: FacetGroupProps): ReactElement {
  const labels = { ...defaultFacetFilterLabels, ...labelOverrides };
  const headingId = useId();
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const limit = facet.maxVisible ?? maxVisible;
  const isBoolean = facet.type === "boolean";
  const isSingle = facet.type === "single";
  const foldable = !isBoolean && (facet.collapsible ?? collapsibleAll);
  const [folded, setFolded] = useState(() => foldable && facet.defaultCollapsed === true && selected.length === 0);
  const bodyId = useId();

  // A selected value that's no longer among the options (e.g. after a refetch) must stay visible,
  // otherwise it would keep filtering with no way to untick it.
  const baseOptions = facet.options ?? [];
  const known = new Set(baseOptions.map((option) => option.value));
  const isRange = facet.type === "range" && facet.range !== undefined;
  const isDateRange = facet.type === "dateRange";
  const options = isRange || isDateRange ? [] : [
    ...baseOptions,
    ...selected.filter((value) => !known.has(value)).map((value): FacetOption => ({ value })),
  ];
  // Selected options always stay visible, even when collapsed.
  const collapsedOptions = options.filter((option, index) => index < limit || selected.includes(option.value));
  // Hiding one or two rows behind a button saves nothing.
  const serverSearch = facet.onSearchChange !== undefined;
  const hasSearch = facet.searchable === true || serverSearch;
  const asDropdown = facet.display === "dropdown" && !isBoolean && !isRange && !isDateRange;
  const searching = hasSearch && query.trim() !== "";
  const canExpand = !searching && options.length - collapsedOptions.length > 2;
  const optionText = (option: FacetOption): string =>
    (typeof option.label === "string" ? option.label : option.value).toLowerCase();
  const visible = searching && !serverSearch
    ? options.filter((option) => optionText(option).includes(query.trim().toLowerCase()))
    : expanded || isBoolean || !canExpand
      ? options
      : collapsedOptions;
  const hidden = options.length - collapsedOptions.length;

  const headingClass = "font-semibold text-muted-foreground text-xs uppercase tracking-wide";
  const body = folded ? null : (
    <div id={bodyId} className="space-y-1.5">
      {hasSearch && !asDropdown && !facet.render && !isRange && !isDateRange && (
        <Input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            facet.onSearchChange?.(event.target.value);
          }}
          placeholder={labels.searchPlaceholder(facet.label)}
          aria-label={labels.searchPlaceholder(facet.label)}
          className="h-8 text-sm"
        />
      )}
      {facet.render ? (
        facet.render({ selected, onSelectedChange })
      ) : isRange && facet.range ? (
        <RangeFacetBody
          config={facet.range}
          selected={selected}
          onSelectedChange={onSelectedChange}
          labels={{ min: labels.rangeMin, max: labels.rangeMax }}
        />
      ) : isDateRange ? (
        <DateRangeFacetBody config={facet.dateRange} selected={selected} onSelectedChange={onSelectedChange} />
      ) : asDropdown ? (
        <div className="px-1.5">
          {(() => {
            const comboOptions = options.map((option) => ({
              value: option.value,
              disabled: option.disabled,
              label:
                (typeof option.label === "string" ? option.label : option.value) +
                (option.count !== undefined ? ` (${formatCount(option.count)})` : ""),
            }));
            const shared = {
              options: comboOptions,
              placeholder: labels.dropdownPlaceholder(facet.label),
              searchPlaceholder: labels.searchPlaceholder(facet.label),
              emptyMessage: labels.noMatches,
              onSearchChange: facet.onSearchChange,
              container: popoverContainer,
              className: "w-full",
            };
            return isSingle ? (
              <Combobox
                {...shared}
                value={selected[0] ?? null}
                onChange={(next) => onSelectedChange(next === null ? [] : [next])}
              />
            ) : (
              <Combobox {...shared} multiple value={selected} onChange={onSelectedChange} />
            );
          })()}
        </div>
      ) : (
        <ul id={listId} className="space-y-0.5">
          {visible.slice(0, isBoolean ? 1 : undefined).map((option) => {
            const checked = selected.includes(option.value);
            const name = option.label ?? option.value;
            const empty = option.count === 0 && !checked;
            const rowId = `${listId}-${option.value}`;
            return (
              <li key={option.value}>
                <label
                  htmlFor={rowId}
                  className={cn(
                    "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm hover:bg-foreground/5 pointer-coarse:min-h-11",
                    (option.disabled || empty) && "text-muted-foreground",
                    option.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                  )}
                >
                  {isBoolean ? (
                    <Switch
                      id={rowId}
                      checked={checked}
                      disabled={option.disabled}
                      onCheckedChange={(next) => onSelectedChange(toggle(selected, option.value, next === true))}
                    />
                  ) : isSingle ? (
                    <RadioGroupItem id={rowId} value={option.value} disabled={option.disabled} />
                  ) : (
                    <Checkbox
                      id={rowId}
                      className="border-foreground/40 dark:border-input"
                      checked={checked}
                      disabled={option.disabled}
                      onCheckedChange={(next) => onSelectedChange(toggle(selected, option.value, next === true))}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">{isBoolean ? facet.label : name}</span>
                  {option.count !== undefined && (
                    <>
                      <span aria-hidden="true" className="shrink-0 text-muted-foreground text-xs tabular-nums">
                        {formatCount(option.count)}
                      </span>
                      <span className="sr-only">{labels.optionCount(formatCount(option.count))}</span>
                    </>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {searching && !asDropdown && visible.length === 0 && (
        <p className="px-1.5 text-muted-foreground text-sm">{labels.noMatches}</p>
      )}
      {!facet.render && !isBoolean && !isRange && !isDateRange && !asDropdown && canExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className="rounded px-1.5 py-0.5 font-medium text-foreground/80 text-xs underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? labels.showLess : labels.showMore(hidden)}
        </button>
      )}
      {facet.hasMore && facet.onLoadMore && !facet.render && !isRange && !isDateRange && (!canExpand || expanded || asDropdown) && (
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={facet.loadingMore}
          aria-busy={facet.loadingMore || undefined}
          onClick={facet.onLoadMore}
          className="ml-1.5"
        >
          {facet.loadingMore ? labels.loadingMore : labels.loadMore}
        </Button>
      )}
    </div>
  );

  return (
    <div role="group" aria-labelledby={headingId} className={cn("space-y-1.5", className)} data-facet={facet.key}>
      {/* A boolean facet's switch already carries the label; a heading above it would repeat it. */}
      <div className={cn("flex min-h-6 items-center gap-1.5 px-1.5", isBoolean && "sr-only")}>
        {foldable ? (
          <button
            type="button"
            id={headingId}
            aria-expanded={!folded}
            aria-controls={bodyId}
            onClick={() => setFolded((value) => !value)}
            className={cn(
              headingClass,
              "flex min-w-0 flex-1 items-center gap-1 rounded text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <ChevronDownIcon
              aria-hidden="true"
              className={cn("size-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none", folded && "-rotate-90")}
            />
            <span className="truncate">{facet.label}</span>
            {folded && selected.length > 0 && (
              <>
                <span aria-hidden="true" className="rounded-full bg-foreground px-1.5 text-[10px] text-background tabular-nums">
                  {selected.length}
                </span>
                <span className="sr-only">{labels.selectedCount(selected.length)}</span>
              </>
            )}
          </button>
        ) : (
          <div id={headingId} className={cn(headingClass, "min-w-0 flex-1 truncate")}>
            {facet.label}
          </div>
        )}
        {selected.length > 0 && !isBoolean && !folded && (
          <button
            type="button"
            aria-label={labels.clearFacet(facet.label)}
            onClick={() => onSelectedChange([])}
            className="shrink-0 rounded px-1 font-medium text-[11px] text-foreground/70 underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {labels.clear}
          </button>
        )}
      </div>
      {isSingle && !facet.render ? (
        <RadioGroup
          value={selected[0] ?? ""}
          onValueChange={(next) => onSelectedChange([next])}
          className="gap-0"
          aria-labelledby={headingId}
        >
          {body}
        </RadioGroup>
      ) : (
        body
      )}
    </div>
  );
}

export interface FacetFilterProps extends SharedProps {
  facets: FacetDefinition[];
  /** Selection per facet key. Controlled. */
  value: FacetFilterValue;
  onValueChange: (next: FacetFilterValue) => void;
  /** Hide facets without options. @default true */
  hideEmpty?: boolean;
  /** Shows a reset button while something is selected. @default true */
  showReset?: boolean;
  className?: string;
}

/**
 * Faceted-search sidebar: one section per facet with checkbox options and
 * result counts ("Supplier · Acme 42"), plus switch rows for yes/no facets.
 * Controlled via `value` (`{ [facetKey]: selectedValues[] }`); the caller
 * fetches facets and applies the selection. Wrap in `AsyncBoundary` for
 * loading/error. For a single dropdown filter use `Combobox`.
 */
export function FacetFilter({
  facets,
  value,
  onValueChange,
  hideEmpty = true,
  showReset = true,
  className,
  labels: labelOverrides,
  ...shared
}: FacetFilterProps): ReactElement {
  const labels = { ...defaultFacetFilterLabels, ...labelOverrides };
  const active = countActiveFacets(value);

  const setSelected = (key: string, next: string[]): void => {
    const { [key]: _removed, ...rest } = value;
    onValueChange(next.length > 0 ? { ...rest, [key]: next } : rest);
  };

  return (
    <div className={cn("space-y-5", className)}>
      {/* Always rendered (disabled while nothing is selected) so the facets don't jump on the first tick. */}
      {showReset && (
        <Button type="button" variant="ghost" size="xs" disabled={active === 0} onClick={() => onValueChange({})}>
          {labels.reset}
        </Button>
      )}
      {facets
        .filter((facet) => !hideEmpty || hasBody(facet))
        .map((facet) => (
          <FacetGroup
            key={facet.key}
            facet={facet}
            selected={value[facet.key] ?? []}
            onSelectedChange={(next) => setSelected(facet.key, next)}
            labels={labelOverrides}
            {...shared}
          />
        ))}
    </div>
  );
}

export interface FacetFilterSkeletonProps {
  /** Number of placeholder sections. @default 3 */
  groups?: number;
  /** Rows per section. @default 4 */
  rows?: number;
  className?: string;
}

/** Placeholder with the same rhythm as {@link FacetFilter}, for the first load; swap it for the real filter once facets arrive. */
export function FacetFilterSkeleton({ groups = 3, rows = 4, className }: FacetFilterSkeletonProps): ReactElement {
  return (
    <div aria-hidden="true" className={cn("space-y-5", className)}>
      {Array.from({ length: groups }, (_, group) => (
        <div key={group} className="space-y-2.5 px-1.5">
          <Skeleton className="h-3 w-24 bg-foreground/10" />
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-sm bg-foreground/10" />
              <Skeleton className="h-3.5 flex-1 bg-foreground/10" style={{ maxWidth: `${60 + ((group * 7 + row * 13) % 35)}%` }} />
              <Skeleton className="h-3 w-7 bg-foreground/10" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
