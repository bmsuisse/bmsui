import { type ReactElement, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { Checkbox } from "../../primitives/checkbox";
import { Switch } from "../../primitives/switch";

export interface FacetOption {
  value: string;
  /** Shown instead of `value`. */
  label?: ReactNode;
  /** Number of results with this value, shown right-aligned. */
  count?: number;
  disabled?: boolean;
}

export interface Facet {
  /** Key in {@link FacetFilterValue}. */
  key: string;
  label: string;
  options: FacetOption[];
  /** `list` (default): a checkbox per option. `boolean`: a switch for the first option (its value is what gets selected). */
  type?: "list" | "boolean";
  /** Overrides the filter-wide `maxVisible` for this facet. */
  maxVisible?: number;
}

/** Selected option values per facet key; a facet without selection has no key. */
export type FacetFilterValue = Record<string, string[]>;

export interface FacetFilterLabels {
  showMore: (hidden: number) => string;
  showLess: string;
  reset: string;
  /** Read out after an option's name, e.g. "42 results". */
  optionCount: (count: number) => string;
}

export const defaultFacetFilterLabels: FacetFilterLabels = {
  showMore: (hidden) => `Show ${hidden} more`,
  showLess: "Show less",
  reset: "Reset filters",
  optionCount: (count) => `${count} results`,
};

/** Number of selected options over all facets. */
export function countActiveFilters(value: FacetFilterValue): number {
  return Object.values(value).reduce((sum, selected) => sum + selected.length, 0);
}

interface SharedProps {
  maxVisible?: number;
  formatCount?: (count: number) => string;
  labels?: Partial<FacetFilterLabels>;
}

export interface FacetGroupProps extends SharedProps {
  facet: Facet;
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  className?: string;
}

const defaultFormatCount = (count: number): string => new Intl.NumberFormat().format(count);

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
  const limit = facet.maxVisible ?? maxVisible;
  const isBoolean = facet.type === "boolean";

  // Selected options always stay visible, even when collapsed.
  const collapsedOptions = facet.options.filter(
    (option, index) => index < limit || selected.includes(option.value),
  );
  const visible = expanded || isBoolean ? facet.options : collapsedOptions;
  const hidden = facet.options.length - collapsedOptions.length;

  return (
    <div role="group" aria-labelledby={headingId} className={cn("space-y-1.5", className)} data-facet={facet.key}>
      <div id={headingId} className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        {facet.label}
      </div>
      <ul id={listId} className="space-y-0.5">
        {visible.slice(0, isBoolean ? 1 : undefined).map((option) => {
          const checked = selected.includes(option.value);
          const name = option.label ?? option.value;
          const Control = isBoolean ? Switch : Checkbox;
          return (
            <li key={option.value}>
              <label
                className={cn(
                  "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm hover:bg-foreground/5 max-md:min-h-11",
                  option.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                )}
              >
                <Control
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
                    <span className="sr-only">{labels.optionCount(option.count)}</span>
                  </>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      {!isBoolean && hidden > 0 && (
        <Button
          type="button"
          variant="link"
          size="xs"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className="h-auto px-1.5 py-0.5 text-xs"
        >
          {expanded ? labels.showLess : labels.showMore(hidden)}
        </Button>
      )}
    </div>
  );
}

export interface FacetFilterProps extends SharedProps {
  facets: Facet[];
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
  const active = countActiveFilters(value);

  const setSelected = (key: string, next: string[]): void => {
    const { [key]: _removed, ...rest } = value;
    onValueChange(next.length > 0 ? { ...rest, [key]: next } : rest);
  };

  return (
    <div className={cn("space-y-5", className)}>
      {showReset && active > 0 && (
        <Button type="button" variant="ghost" size="xs" onClick={() => onValueChange({})}>
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
