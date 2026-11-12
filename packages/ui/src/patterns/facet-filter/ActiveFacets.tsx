import { XMarkIcon } from "@heroicons/react/20/solid";
import type { ReactElement } from "react";
import { cn } from "../../lib/utils";
import type { FacetDefinition, FacetFilterValue } from "./FacetFilter";

export interface ActiveFacetsLabels {
  /** Button that clears everything. */
  clearAll: string;
  /** Accessible name of a chip's remove button, e.g. "Remove Acme AG". */
  remove: (label: string) => string;
  /** Accessible name of the chip list. */
  listLabel: string;
}

export const defaultActiveFacetsLabels: ActiveFacetsLabels = {
  clearAll: "Clear all",
  remove: (label) => `Remove ${label}`,
  listLabel: "Active filters",
};

export interface ActiveFacetsProps {
  facets: FacetDefinition[];
  value: FacetFilterValue;
  onValueChange: (next: FacetFilterValue) => void;
  labels?: Partial<ActiveFacetsLabels>;
  className?: string;
}

function textOf(facet: FacetDefinition, selected: string): string {
  if (facet.type === "boolean") return facet.label;
  const option = facet.options.find((entry) => entry.value === selected);
  return typeof option?.label === "string" ? option.label : (option?.value ?? selected);
}

/**
 * The applied filters as removable chips ("Acme AG ×") plus a Clear all link, for the strip above
 * a result list. Pass the same `facets` and `value` as the {@link FacetFilter} next to it. Renders
 * nothing while no filter is active.
 */
export function ActiveFacets({
  facets,
  value,
  onValueChange,
  labels: labelOverrides,
  className,
}: ActiveFacetsProps): ReactElement | null {
  const labels = { ...defaultActiveFacetsLabels, ...labelOverrides };
  const chips = facets.flatMap((facet) =>
    (value[facet.key] ?? []).map((selected) => ({ facet, selected, text: textOf(facet, selected) })),
  );
  if (chips.length === 0) return null;

  const remove = (key: string, selected: string): void => {
    const { [key]: current = [], ...rest } = value;
    const next = current.filter((entry) => entry !== selected);
    onValueChange(next.length > 0 ? { ...rest, [key]: next } : rest);
  };

  return (
    <ul aria-label={labels.listLabel} className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map(({ facet, selected, text }) => (
        <li key={`${facet.key}:${selected}`}>
          <button
            type="button"
            aria-label={labels.remove(text)}
            onClick={() => remove(facet.key, selected)}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-foreground/15 bg-background pr-1.5 pl-2.5 text-xs hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none dark:border-border"
          >
            {text}
            <XMarkIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => onValueChange({})}
          className="rounded px-1 font-medium text-foreground/80 text-xs underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {labels.clearAll}
        </button>
      </li>
    </ul>
  );
}
