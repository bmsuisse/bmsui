import { FunnelIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import type { EnumColumn, EnumOption } from "../column/types";
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

interface OptionGroup {
  /** undefined for the ungrouped section, which is always listed first. */
  group: string | undefined;
  options: EnumOption[];
}

/**
 * Buckets `options` by `option.group`, preserving each group's first-seen
 * order and each option's original order within its group — same idiom as
 * `column-selector/visibility.ts`'s `groupColumns`. The ungrouped section is
 * always first, regardless of where ungrouped options fall in the input.
 */
function groupOptions(options: EnumOption[]): OptionGroup[] {
  const ungrouped: EnumOption[] = [];
  const named = new Map<string, EnumOption[]>();

  for (const option of options) {
    if (option.group === undefined) {
      ungrouped.push(option);
      continue;
    }
    const bucket = named.get(option.group);
    if (bucket) bucket.push(option);
    else named.set(option.group, [option]);
  }

  const result: OptionGroup[] = [];
  if (ungrouped.length > 0) result.push({ group: undefined, options: ungrouped });
  for (const [group, groupedOptions] of named) result.push({ group, options: groupedOptions });
  return result;
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
 * - options that share an `EnumOption.group` are clustered under a group
 *   header with its own tri-state checkbox, letting a whole group be
 *   selected/deselected in one click; the header's state and toggle are
 *   scoped to that group's currently-*visible* options, same as "Select
 *   all". Ungrouped options render first, with no header.
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

  const visibleGroups = useMemo(() => groupOptions(visibleOptions), [visibleOptions]);

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

  /** Selects/deselects every currently-*visible* option within a single group. */
  function toggleGroup(groupValues: string[], allSelected: boolean): void {
    if (allSelected) {
      emit(selected.filter((v) => !groupValues.includes(v)));
      return;
    }
    const next = new Set(selected);
    for (const v of groupValues) next.add(v);
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
        {visibleGroups.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">No matches.</p>
        ) : (
          visibleGroups.map((optionGroup) => {
            const groupValues = optionGroup.options.map((option) => option.value);
            const groupSelectedCount = groupValues.filter((v) => selected.includes(v)).length;
            const allGroupSelected = groupSelectedCount === groupValues.length;
            const someGroupSelected = groupSelectedCount > 0 && !allGroupSelected;

            return (
              <div key={optionGroup.group ?? "__ungrouped"}>
                {optionGroup.group !== undefined && (
                  <label className="flex items-center gap-2 rounded-sm px-1 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    <Checkbox
                      checked={someGroupSelected ? "indeterminate" : allGroupSelected}
                      onCheckedChange={() => toggleGroup(groupValues, allGroupSelected)}
                      aria-label={`Select all in ${optionGroup.group}`}
                    />
                    {optionGroup.group}
                  </label>
                )}
                {optionGroup.options.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-accent hover:text-accent-foreground",
                      optionGroup.group !== undefined && "pl-5",
                    )}
                  >
                    <Checkbox
                      checked={selected.includes(option.value)}
                      onCheckedChange={() => emit(toggle(selected, option.value))}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            );
          })
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
          <FunnelIcon
            className={cn("h-3.5 w-3.5 shrink-0", isFiltered ? "opacity-100 text-primary" : "opacity-40")}
            aria-hidden
          />
          {isFiltered && <span className="truncate">{summary}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">{panel}</PopoverContent>
    </Popover>
  );
}
