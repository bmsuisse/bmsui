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
import { useFilterLabels } from "./labels";
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

interface OptionRow {
  option: EnumOption;
  index: number;
}
interface GroupChunk {
  kind: "group";
  group: string;
  rows: OptionRow[];
}
interface SingleChunk {
  kind: "single";
  row: OptionRow;
}
type RenderChunk = GroupChunk | SingleChunk;

/**
 * Chunks `options` into per-group runs versus lone ungrouped rows, in one
 * linear pass — same contiguous-group contract as `@bmsuisse/ui`'s
 * `Combobox`/`TagCombobox` (see `EnumOption.group`'s own doc): a header
 * renders the first time a group key is seen, so options sharing a `group`
 * must be adjacent in the array. Kept separate from JSX so the render below
 * is a plain `.map()` with no per-row bookkeeping of its own.
 */
function buildRenderChunks(options: EnumOption[]): RenderChunk[] {
  const chunks: RenderChunk[] = [];
  options.forEach((option, index) => {
    const row: OptionRow = { option, index };
    const last = chunks[chunks.length - 1];
    if (option.group && last?.kind === "group" && last.group === option.group) {
      last.rows.push(row);
    } else if (option.group) {
      chunks.push({ kind: "group", group: option.group, rows: [row] });
    } else {
      chunks.push({ kind: "single", row });
    }
  });
  return chunks;
}

type GroupCheckState = "checked" | "unchecked" | "indeterminate";

/** Tri-state of `group` scoped to `candidates` — pass the currently-*visible* (search-filtered) options, matching "Select all"'s own scoping. */
function groupCheckState(candidates: EnumOption[], selected: string[], group: string): GroupCheckState {
  const members = candidates.filter((o) => o.group === group).map((o) => o.value);
  const selectedCount = members.filter((v) => selected.includes(v)).length;
  if (members.length === 0 || selectedCount === 0) return "unchecked";
  return selectedCount === members.length ? "checked" : "indeterminate";
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
 * - options sharing an `EnumOption.group` render under a sticky group
 *   header with its own tri-state checkbox, letting a whole group be
 *   selected/deselected in one click — mirrors `@bmsuisse/ui`'s
 *   `Combobox`/`TagCombobox` grouped-dropdown treatment (sticky `bg-muted`
 *   header, same contiguous-group chunking), kept as a local mirror rather
 *   than a shared dependency since `datagrid` and `ui` are sibling packages
 *   with no cross-dependency (see that package's `Combobox` doc, which
 *   mirrors this component's own plain-substring search for the same
 *   reason). The header's tri-state and toggle are scoped to that group's
 *   currently-*visible* options, same as "Select all" — unlike `Combobox`,
 *   which scopes its group toggle to the full option set regardless of
 *   search.
 * - every visible option gets its own plain checkbox + label row (a real
 *   shadcn `Checkbox`, not a menu item — unlike `Combobox`'s button/`role=
 *   "option"` rows), inside a scrollable list so long option lists don't
 *   blow up the popover's height.
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
  labels: labelOverrides,
}: FilterWidgetProps<EnumColumn<TRow>> & { bare?: boolean }): ReactElement {
  const labels = useFilterLabels(labelOverrides);
  const [search, setSearch] = useState("");
  const selected = selectedValuesOf(value);

  const visibleOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return column.options;
    return column.options.filter((option) => option.label.toLowerCase().includes(term));
  }, [column.options, search]);

  const renderChunks = useMemo(() => buildRenderChunks(visibleOptions), [visibleOptions]);

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
  function toggleGroup(group: string): void {
    const members = visibleOptions.filter((o) => o.group === group).map((o) => o.value);
    if (groupCheckState(visibleOptions, selected, group) === "checked") {
      emit(selected.filter((v) => !members.includes(v)));
      return;
    }
    emit([...new Set([...selected, ...members])]);
  }

  function renderOption(option: EnumOption): ReactElement {
    return (
      <label
        key={option.value}
        className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        <Checkbox
          checked={selected.includes(option.value)}
          onCheckedChange={() => emit(toggle(selected, option.value))}
        />
        {option.label}
      </label>
    );
  }

  const isFiltered = selected.length > 0;
  const summary = labels.selectedCount(selected.length);

  const panel = (
    <div className={bare ? "flex w-full flex-col gap-2" : "flex w-64 flex-col gap-2 p-2"}>
      <Input
        placeholder={labels.searchPlaceholder(column.header)}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <label className="flex items-center gap-2 border-b px-1 pb-2 text-sm">
        <Checkbox
          checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
          disabled={visibleValues.length === 0}
          onCheckedChange={toggleSelectAllVisible}
          aria-label={labels.selectAll}
        />
        {labels.selectAll}
      </label>
      <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
        {renderChunks.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">{labels.noMatches}</p>
        ) : (
          renderChunks.map((chunk) => {
            if (chunk.kind === "single") return renderOption(chunk.row.option);
            const headerState = groupCheckState(visibleOptions, selected, chunk.group);
            return (
              // The header and every one of its group's rows share this wrapper --
              // its bounds are the sticky header's containing block, so `sticky
              // top-0` keeps the header pinned for the group's whole scroll extent
              // instead of just past its first row.
              <div key={`group-${chunk.group}`} className="flex flex-col gap-0.5">
                <label
                  data-group-header
                  className="sticky top-0 z-10 flex items-center gap-2 rounded-sm bg-muted px-2 py-1.5 text-sm font-semibold text-foreground"
                >
                  <Checkbox
                    checked={headerState === "indeterminate" ? "indeterminate" : headerState === "checked"}
                    onCheckedChange={() => toggleGroup(chunk.group)}
                    aria-label={labels.selectAllOfGroup(chunk.group)}
                  />
                  {chunk.group}
                </label>
                {chunk.rows.map((row) => renderOption(row.option))}
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
          aria-label={labels.filterAriaLabel(column.header)}
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
