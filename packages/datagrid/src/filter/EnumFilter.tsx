import { FunnelIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import type { EnumColumn } from "../column/types";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../lib/utils";
import type { FilterDescriptor } from "./types";
import type { FilterWidgetProps } from "./widget-types";

function selectedValuesOf(value: FilterDescriptor | undefined): string[] {
  if (!value || value.operator !== "in" || !Array.isArray(value.value)) return [];
  return value.value.filter((entry): entry is string => typeof entry === "string");
}

function toggle(selected: string[], optionValue: string): string[] {
  return selected.includes(optionValue)
    ? selected.filter((v) => v !== optionValue)
    : [...selected, optionValue];
}

/**
 * Default filter widget for `type: "enum"` columns: a single Excel-style
 * checkbox list, regardless of how many `column.options` there are (no
 * short-list/long-list branch) —
 *
 * - a search input filters which options *render* below via a plain
 *   substring match against each option's label; it never touches the
 *   committed filter on its own.
 * - a tri-state "Select all" checkbox acts on whatever subset is currently
 *   visible after that search, not the full option set — matching Excel's
 *   own column-filter behavior ("select all of what's shown").
 * - every visible option gets its own plain checkbox + label row (a real
 *   shadcn `Checkbox`, not a menu item), inside a scrollable list so long
 *   option lists don't blow up the popover's height.
 * - every toggle emits the updated `FilterDescriptor` immediately — there's
 *   no OK/Cancel step, matching every other filter widget in this package.
 *
 * `bare` (default `false`) skips this component's own Popover/trigger
 * Button, rendering just the search input + option list directly — for a
 * caller that already provides its own popover/collapsible (this is what
 * `renderDefaultFilterWidget` passes automatically outside `filterDisplay:
 * "row"`, so `<DataGrid>`'s own header-icon popover isn't nested inside a
 * second one of this component's own).
 */
export function EnumFilter<TRow>({
  column,
  value,
  onChange,
  bare = false,
}: FilterWidgetProps<EnumColumn<TRow>> & { bare?: boolean }): ReactElement {
  const [search, setSearch] = useState("");
  const selected = selectedValuesOf(value);

  const visibleOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return column.options;
    return column.options.filter((option) => option.label.toLowerCase().includes(term));
  }, [column.options, search]);

  function emit(next: string[]): void {
    onChange(next.length === 0 ? undefined : { field: column.id, operator: "in", value: next });
  }

  const visibleValues = visibleOptions.map((option) => option.value);
  const visibleSelectedCount = visibleValues.filter((v) => selected.includes(v)).length;
  const allVisibleSelected = visibleValues.length > 0 && visibleSelectedCount === visibleValues.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  /** Selects/deselects every currently-*visible* option, leaving any selection outside the search term untouched. */
  function toggleSelectAllVisible(): void {
    if (allVisibleSelected) {
      emit(selected.filter((v) => !visibleValues.includes(v)));
      return;
    }
    const next = new Set(selected);
    for (const v of visibleValues) next.add(v);
    emit([...next]);
  }

  const isFiltered = selected.length > 0;
  const summary = `${selected.length} selected`;

  const panel = (
    <div className={bare ? "flex w-full flex-col gap-2" : "flex w-64 flex-col gap-2 p-2"}>
      <Input
        placeholder={`Search ${column.header.toLowerCase()}...`}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <label className="flex items-center gap-2 border-b px-1 pb-2 text-sm">
        <Checkbox
          checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
          disabled={visibleValues.length === 0}
          onCheckedChange={toggleSelectAllVisible}
          aria-label="Select all"
        />
        Select all
      </label>
      <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
        {visibleOptions.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">No matches.</p>
        ) : (
          visibleOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => emit(toggle(selected, option.value))}
              />
              {option.label}
            </label>
          ))
        )}
      </div>
    </div>
  );

  if (bare) {
    return <div data-testid={`filter-${column.id}`}>{panel}</div>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1", isFiltered ? "max-w-[180px] px-2" : "w-8 justify-center px-0")}
          aria-label={`Filter ${column.header}`}
          data-testid={`filter-${column.id}`}
        >
          <FunnelIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          {isFiltered && <span className="truncate">{summary}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">{panel}</PopoverContent>
    </Popover>
  );
}
