import { type ReactElement, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { Checkbox } from "../../primitives/checkbox";
import { Input } from "../../primitives/input";
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
  options: FacetOption[];
  /** `list` (default): a checkbox per option. `boolean`: a switch for the first option (its value is what gets selected). */
  type?: "list" | "boolean";
  /** Overrides the filter-wide `maxVisible` for this facet. */
  maxVisible?: number;
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
  searchPlaceholder: (facetLabel) => `Search ${facetLabel.toLowerCase()}`,
  noMatches: "No matches",
  optionCount: (count) => `${count} results`,
};

/** Number of selected options over all facets. */
export function countActiveFacets(value: FacetFilterValue): number {
  return Object.values(value).reduce((sum, selected) => sum + selected.length, 0);
}

interface SharedProps {
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

  // A selected value that's no longer among the options (e.g. after a refetch) must stay visible,
  // otherwise it would keep filtering with no way to untick it.
  const known = new Set(facet.options.map((option) => option.value));
  const options = [
    ...facet.options,
    ...selected.filter((value) => !known.has(value)).map((value): FacetOption => ({ value })),
  ];
  // Selected options always stay visible, even when collapsed.
  const collapsedOptions = options.filter((option, index) => index < limit || selected.includes(option.value));
  // Hiding one or two rows behind a button saves nothing.
  const searching = facet.searchable === true && query.trim() !== "";
  const collapsible = !searching && options.length - collapsedOptions.length > 2;
  const optionText = (option: FacetOption): string =>
    (typeof option.label === "string" ? option.label : option.value).toLowerCase();
  const visible = searching
    ? options.filter((option) => optionText(option).includes(query.trim().toLowerCase()))
    : expanded || isBoolean || !collapsible
      ? options
      : collapsedOptions;
  const hidden = options.length - collapsedOptions.length;

  return (
    <div role="group" aria-labelledby={headingId} className={cn("space-y-1.5", className)} data-facet={facet.key}>
      {/* A boolean facet's switch already carries the label; a heading above it would repeat it. */}
      <div
        id={headingId}
        className={cn(
          "px-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide",
          isBoolean && "sr-only",
        )}
      >
        {facet.label}
      </div>
      {facet.searchable && !facet.render && (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder(facet.label)}
          aria-label={labels.searchPlaceholder(facet.label)}
          className="h-8 text-sm"
        />
      )}
      {facet.render ? (
        facet.render({ selected, onSelectedChange })
      ) : (
      <ul id={listId} className="space-y-0.5">
        {visible.slice(0, isBoolean ? 1 : undefined).map((option) => {
          const checked = selected.includes(option.value);
          const name = option.label ?? option.value;
          const Control = isBoolean ? Switch : Checkbox;
          return (
            <li key={option.value}>
              <label
                className={cn(
                  "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm hover:bg-foreground/5 pointer-coarse:min-h-11",
                  option.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                )}
              >
                <Control
                  className={isBoolean ? undefined : "border-foreground/40 dark:border-input"}
                  checked={checked}
                  disabled={option.disabled}
                  onCheckedChange={(next) => onSelectedChange(toggle(selected, option.value, next === true))}
                />
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
      {searching && visible.length === 0 && (
        <p className="px-1.5 text-muted-foreground text-sm">{labels.noMatches}</p>
      )}
      {!facet.render && !isBoolean && collapsible && (
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
        .filter((facet) => !hideEmpty || facet.options.length > 0)
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
