import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../lib/utils";
import { withoutColumn } from "./facetedValues";
import type { FilterLabels } from "./labels";
import { useFilterLabels } from "./labels";
import { fieldKey, isCompositeFilterDescriptor, leafFilters } from "./types";
import type { FilterDescriptor, GridState } from "./types";

export interface FilterDescription {
  label: string;
  operator: string;
  value: string;
}

/** The parts of one active-filter chip: "Status" "is any of" "Open, Closed". */
export function describeFilter<TRow>(
  filter: FilterDescriptor,
  columns: readonly ColumnDef<TRow>[],
  labels: FilterLabels,
): FilterDescription {
  const id = fieldKey(filter.field);
  const column = columns.find((c) => c.id === id);
  const show = (value: unknown): string => {
    if (typeof value === "boolean") return value ? labels.booleanYes : labels.booleanNo;
    return column ? defaultFormat(column, value) : String(value);
  };
  const raw = filter.value;
  const value = Array.isArray(raw) ? raw.map(show).join(filter.operator === "between" ? " – " : ", ") : raw === undefined ? "" : show(raw);
  return { label: column?.header ?? id, operator: labels.operatorLabel(filter.operator), value };
}

export interface ActiveFilterBarProps<TRow> {
  /** The grid's `GridState.filter`. */
  filter: GridState["filter"];
  columns: readonly ColumnDef<TRow>[];
  onFilterChange: (next: GridState["filter"]) => void;
  /** Chips shown before the rest go into a "+N more" popover. Default 3. */
  maxChips?: number;
  className?: string;
  labels?: Partial<FilterLabels>;
}

function Chip<TRow>({
  filter,
  columns,
  labels,
  onRemove,
}: {
  filter: FilterDescriptor;
  columns: readonly ColumnDef<TRow>[];
  labels: FilterLabels;
  onRemove: () => void;
}): ReactElement {
  const { label, operator, value } = describeFilter(filter, columns, labels);
  const text = `${label} ${operator}${value ? ` ${value}` : ""}`;
  return (
    <span
      data-testid={`filter-chip-${fieldKey(filter.field)}`}
      className="inline-flex min-w-0 max-w-[22rem] shrink items-center gap-1 rounded-full border border-primary/25 bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary"
      title={text}
    >
      <span className="truncate">
        <strong className="font-semibold">{label}</strong> {operator}
        {value && <> {value}</>}
      </span>
      <button
        type="button"
        aria-label={labels.removeFilter(text)}
        onClick={onRemove}
        className="flex-none rounded-full p-0.5 hover:bg-primary/20"
      >
        <XMarkIcon className="h-3 w-3" aria-hidden />
      </button>
    </span>
  );
}

/**
 * The active filters of a grid as removable chips, in a fixed-height strip
 * that renders whether or not a filter is active, so applying or clearing a
 * filter never moves the table below it. Pair it with `<DataGrid gridState
 * onGridStateChange>` (fully controlled) and feed `filter` from that state.
 */
export function ActiveFilterBar<TRow>({
  filter,
  columns,
  onFilterChange,
  maxChips = 3,
  className,
  labels: labelOverrides,
}: ActiveFilterBarProps<TRow>): ReactElement {
  const labels = useFilterLabels(labelOverrides);
  const leaves = leafFilters(filter);
  const count = leaves.length;
  const shown = leaves.slice(0, maxChips);
  const hidden = leaves.slice(maxChips);

  function remove(leaf: FilterDescriptor): void {
    const next = withoutColumn(filter, fieldKey(leaf.field));
    if (!next) onFilterChange(null);
    else onFilterChange(isCompositeFilterDescriptor(next) ? next : { logic: "and", filters: [next] });
  }

  const chip = (leaf: FilterDescriptor, index: number): ReactElement => (
    <Chip
      key={`${fieldKey(leaf.field)}-${index}`}
      filter={leaf}
      columns={columns}
      labels={labels}
      onRemove={() => remove(leaf)}
    />
  );

  return (
    <div
      data-testid="active-filter-bar"
      className={cn(
        "flex h-10 flex-none items-center gap-2 overflow-hidden border-b border-border bg-muted/40 px-3 text-xs",
        className,
      )}
    >
      <span className="flex flex-none items-center gap-1.5 font-semibold text-muted-foreground">
        <FunnelIcon className={cn("h-3 w-3", count > 0 && "text-primary")} aria-hidden />
        {count > 0 ? labels.activeFilters(count) : labels.noActiveFilters}
      </span>
      {count === 0 && <span className="truncate text-muted-foreground/70">{labels.noActiveFiltersHint}</span>}
      {shown.map(chip)}
      {hidden.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex-none rounded-full border border-border bg-background px-2.5 py-0.5 font-medium text-foreground hover:bg-muted"
            >
              {labels.moreFilters(hidden.length)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="flex w-auto max-w-sm flex-col items-start gap-1.5 p-2">
            {hidden.map((leaf, i) => chip(leaf, maxChips + i))}
          </PopoverContent>
        </Popover>
      )}
      <button
        type="button"
        onClick={() => onFilterChange(null)}
        disabled={count === 0}
        className={cn(
          "ml-auto flex-none text-xs font-medium text-muted-foreground underline transition-colors hover:text-destructive",
          count === 0 && "invisible",
        )}
      >
        {labels.clearAllFilters}
      </button>
    </div>
  );
}
