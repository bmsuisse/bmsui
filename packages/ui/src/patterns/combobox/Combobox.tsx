import { Check, ChevronsUpDown, X } from "lucide-react";
import type { ComponentProps, KeyboardEvent, ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Groups this option under a header with the given key, rendered as a bold label
   * (plus a tri-state "select all" checkbox in multi-select mode — see `groupLabels`
   * on the base props). Options sharing a `group` must be contiguous in `options` —
   * the component renders a header the first time a group key is seen and does not
   * re-sort the list, so interleaved groups would render more than one header for the
   * same key. Ungrouped options (no `group`) render individually, with no header. */
  group?: string;
}

interface ComboboxBaseProps {
  /** The full option list. Filtering happens client-side against `label`. */
  options: ComboboxOption[];
  /** Trigger text shown when nothing is selected. Defaults to `"Select…"`. */
  placeholder?: string;
  /** Placeholder for the search input inside the popover. Defaults to `"Search…"`. */
  searchPlaceholder?: string;
  /** Shown when the search term matches nothing. Defaults to `"No matches."`. */
  emptyMessage?: string;
  disabled?: boolean;
  /** Shows `loadingMessage` on the trigger instead of the placeholder/selection, and
   * disables the trigger and clear affordance alongside `disabled`. For a combobox whose
   * `options` are still being fetched. Defaults to `false`. */
  loading?: boolean;
  /** Trigger text shown while `loading` is true. Defaults to `"Loading…"`. */
  loadingMessage?: string;
  /** Shows a clear ("x") affordance on the trigger when a value is selected. Defaults to `true`. */
  clearable?: boolean;
  className?: string;
  id?: string;
  /** Forwarded to the trigger button, for test targeting (e.g. Playwright/Testing Library). */
  "data-testid"?: string;
  /** Display label for a group key (`ComboboxOption.group`). Falls back to the raw key
   * when an entry is missing. Only relevant when at least one option sets `group`. */
  groupLabels?: Record<string, string>;
  /** Portal target for the popover, forwarded to the underlying `PopoverContent`.
   * Needed when the combobox is opened from inside a modal Dialog/Sheet — pass the
   * Dialog/Sheet content element so the popover portals inside it instead of
   * `document.body`, which would otherwise fight with the Dialog's focus trap. */
  container?: ComponentProps<typeof PopoverContent>["container"];
  /** Switches the search input to server-driven mode: called with the raw search
   * text on every keystroke (and with `""` when the popover opens), and `options`
   * is rendered as-is instead of being filtered locally against `label`. Omit for
   * the default client-side filtering behavior. */
  onSearchChange?: (search: string) => void;
  /** Fallback trigger label used when the current selection's `value`(s) aren't
   * present in `options` — the case in server-driven search mode where the
   * selected option was found by an earlier query and isn't part of the current
   * result page. Ignored once a matching option is found in `options`. */
  selectedLabel?: string;
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  /** Omitted or `false` for the (default) single-select shape below. */
  multiple?: false;
  /** Selected option's `value`, or `null`/`undefined` for no selection. */
  value?: string | null;
  /** Called with the newly selected option's `value`, or `null` when cleared. */
  onChange: (value: string | null) => void;
}

export interface ComboboxMultiProps extends ComboboxBaseProps {
  /** `true` selects the multi-select shape below. */
  multiple: true;
  /** Selected options' `value`s. */
  value: string[];
  /** Called with the full updated selection after a toggle, or `[]` when cleared. */
  onChange: (value: string[]) => void;
}

/**
 * Discriminated on `multiple`: the default (omitted/`false`) shape is the
 * original single-select API, unchanged (`value: string | null`); passing
 * `multiple: true` switches to the array-valued shape (`value: string[]`).
 */
export type ComboboxProps = ComboboxSingleProps | ComboboxMultiProps;

function groupMembers(options: ComboboxOption[], group: string): string[] {
  return options.filter((o) => o.group === group && !o.disabled).map((o) => o.value);
}

type GroupCheckState = "checked" | "unchecked" | "indeterminate";

function groupCheckState(options: ComboboxOption[], selectedValues: string[], group: string): GroupCheckState {
  const members = groupMembers(options, group);
  const selectedCount = members.filter((v) => selectedValues.includes(v)).length;
  if (selectedCount === 0) return "unchecked";
  return selectedCount === members.length ? "checked" : "indeterminate";
}

/** If the current multi-select selection is exactly one or more *fully* selected
 * groups and nothing else, returns those groups' labels joined by ", " (e.g. "Team A"
 * or "Team A, Team B") — so picking a manager's whole team via its header checkbox
 * shows the team's name on the trigger instead of a bare "6 selected". A group
 * selected alongside anything it doesn't fully cover (a partial group, or a full
 * group plus an extra individual pick) returns `null`, falling back to the count. */
function resolveGroupTriggerLabel(
  options: ComboboxOption[],
  selectedValues: string[],
  groupLabel: (group: string) => string,
): string | null {
  const selectedSet = new Set(selectedValues);
  const groupsPresent = Array.from(
    new Set(options.filter((o) => selectedSet.has(o.value) && o.group).map((o) => o.group as string)),
  );
  if (groupsPresent.length === 0) return null;

  const coveredValues = new Set<string>();
  const fullyCoveredGroups: string[] = [];
  for (const group of groupsPresent) {
    const members = groupMembers(options, group);
    if (members.length > 0 && members.every((v) => selectedSet.has(v))) {
      fullyCoveredGroups.push(group);
      for (const v of members) coveredValues.add(v);
    }
  }
  const hasLeftover = selectedValues.some((v) => !coveredValues.has(v));
  if (fullyCoveredGroups.length === 0 || hasLeftover) return null;
  return fullyCoveredGroups.map(groupLabel).join(", ");
}

interface OptionRow {
  option: ComboboxOption;
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

/** Chunks `visibleOptions` into per-group chunks (a header plus all of that group's
 * rows, relying on the "a group's options are contiguous" invariant `ComboboxOption.group`
 * already documents) versus lone ungrouped rows, in one linear pass -- kept separate
 * from JSX so the render below is a plain `.map()` with no per-row bookkeeping of its
 * own. A sticky header can only stay pinned within its own containing block -- the
 * nearest ancestor that isn't itself sticky/statically laid out -- so the header and
 * every one of its group's rows must share one wrapper `<div>`. Rendering each row in
 * its own top-level sibling div (rather than chunking by group) gave the header a
 * containing block of just itself plus the group's first row, so it unstuck after a
 * single row instead of staying pinned for the group's full scroll extent. */
function buildRenderChunks(visibleOptions: ComboboxOption[]): RenderChunk[] {
  const chunks: RenderChunk[] = [];
  visibleOptions.forEach((option, index) => {
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

/**
 * A searchable dropdown ("autocomplete box"), single- or multi-select
 * depending on the `multiple` prop: a button trigger showing the current
 * selection, opening a popover with a text filter above a scrollable option
 * list. Deliberately built on the existing `Popover` + `Input` primitives
 * rather than a `cmdk`-based `Command` component — this mirrors
 * `@bmsuisse/datagrid`'s `EnumFilter` (plain substring filter over a manually
 * rendered list), keeping the dependency footprint the same as the rest of
 * this package instead of introducing a new list/command library.
 */
export function Combobox(props: ComboboxProps): ReactElement {
  const {
    options,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyMessage = "No matches.",
    disabled,
    loading = false,
    loadingMessage = "Loading…",
    clearable = true,
    className,
    id,
    groupLabels,
    container,
    onSearchChange,
    selectedLabel,
  } = props;
  const testId = props["data-testid"];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize both modes to an array so the rest of the component (rendering,
  // active-index bookkeeping) doesn't need to branch on `multiple` at all —
  // only `selectOption` and the clear affordance need mode-specific behavior.
  const selectedValues = useMemo<string[]>(
    () => (props.multiple ? props.value : props.value ? [props.value] : []),
    [props.multiple, props.value],
  );

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedValues.includes(option.value)),
    [options, selectedValues],
  );

  // In server-driven search mode (`onSearchChange` given), `options` is assumed
  // to already be the caller's current result set — filtering it again locally
  // against a possibly-stale `search` term would double-filter and could hide
  // options the server already matched on fields other than `label`.
  const visibleOptions = useMemo(() => {
    if (onSearchChange) return options;
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, search, onSearchChange]);

  // Reset the search box and re-point `activeIndex` at the current selection
  // each time the popover opens — intentionally NOT reactive to `options`/
  // `value` changes while it stays open, only to the open transition itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    setSearch("");
    onSearchChange?.("");
    const firstSelected = selectedValues[0];
    const selectedIdx = firstSelected ? options.findIndex((option) => option.value === firstSelected) : -1;
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
    inputRef.current?.focus();
  }, [open]);

  // Keep the active index in range as the visible list shrinks/grows while typing.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(visibleOptions.length - 1, 0)));
  }, [visibleOptions.length]);

  function selectOption(option: ComboboxOption): void {
    if (option.disabled) return;
    if (props.multiple) {
      const next = props.value.includes(option.value)
        ? props.value.filter((v) => v !== option.value)
        : [...props.value, option.value];
      props.onChange(next);
      return; // multi-select stays open so the user can pick several
    }
    props.onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visibleOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) selectOption(option);
    }
  }

  const groupLabel = (group: string): string => groupLabels?.[group] ?? group;

  function toggleGroup(group: string): void {
    if (!props.multiple) return;
    const members = groupMembers(options, group);
    const next =
      groupCheckState(options, selectedValues, group) === "checked"
        ? props.value.filter((v) => !members.includes(v))
        : Array.from(new Set([...props.value, ...members]));
    props.onChange(next);
  }

  // "N selected" once 2+ are picked (multi-select only — single-select never exceeds
  // 1); the single label at exactly 1; the placeholder at 0; a fully-selected group's
  // own label(s) in place of the count when that applies (see resolveGroupTriggerLabel).
  const triggerLabel = loading
    ? loadingMessage
    : selectedOptions.length === 0
      ? (selectedValues.length > 0 ? (selectedLabel ?? placeholder) : placeholder)
      : selectedOptions.length === 1
        ? (selectedOptions[0]?.label ?? placeholder)
        : (props.multiple ? resolveGroupTriggerLabel(options, selectedValues, groupLabel) : null) ??
          `${selectedOptions.length} selected`;

  const renderChunks = useMemo(() => buildRenderChunks(visibleOptions), [visibleOptions]);

  function renderOption({ option, index }: OptionRow): ReactElement {
    const isSelected = selectedValues.includes(option.value);
    const isActive = index === activeIndex;
    return (
      <button
        key={option.value}
        type="button"
        role="option"
        aria-selected={isSelected}
        disabled={option.disabled}
        data-testid={testId ? `${testId}-option` : undefined}
        data-option-value={option.value}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => selectOption(option)}
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none disabled:pointer-events-none disabled:opacity-50",
          isActive && "bg-accent text-accent-foreground",
        )}
      >
        {props.multiple ? (
          <input
            type="checkbox"
            checked={isSelected}
            readOnly
            tabIndex={-1}
            className="pointer-events-none h-3.5 w-3.5 shrink-0 accent-primary"
          />
        ) : (
          <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
        )}
        <span className="truncate">{option.label}</span>
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          data-testid={testId}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between font-normal",
            (selectedOptions.length === 0 || loading) && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <span className="flex items-center gap-1">
            {clearable && !loading && selectedValues.length > 0 ? (
              <span
                role="button"
                aria-label="Clear selection"
                tabIndex={-1}
                className="rounded-sm p-0.5 opacity-60 hover:bg-accent hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  if (props.multiple) {
                    props.onChange([]);
                  } else {
                    props.onChange(null);
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        container={container}
        className="w-[var(--radix-popover-trigger-width)] min-w-[10rem] p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          <Input
            ref={inputRef}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              onSearchChange?.(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          <div role="listbox" className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
            {renderChunks.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              renderChunks.map((chunk) => {
                if (chunk.kind === "single") return renderOption(chunk.row);
                const headerState = groupCheckState(options, selectedValues, chunk.group);
                return (
                  // The header and every one of its group's rows share this wrapper --
                  // its bounds are the sticky header's containing block, so `sticky top-0`
                  // keeps the header pinned for the group's whole scroll extent instead of
                  // just past its first row (see buildRenderChunks). Spacing above a group
                  // lives on this wrapper's `pt-1`, not on the header itself -- a margin on
                  // the sticky element would travel with it once stuck, leaving a gap at the
                  // scrollport's top that the row behind it shows through.
                  <div key={`group-${chunk.group}`} className="flex flex-col gap-0.5 pt-1 first:pt-0">
                    <div
                      data-group-header
                      className="sticky top-0 z-10 flex items-center gap-2 rounded-sm bg-muted px-2 py-1.5 text-sm font-semibold text-foreground"
                    >
                      {props.multiple ? (
                        <input
                          type="checkbox"
                          checked={headerState === "checked"}
                          ref={(el) => {
                            if (el) el.indeterminate = headerState === "indeterminate";
                          }}
                          onChange={() => toggleGroup(chunk.group)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-3.5 w-3.5 shrink-0 accent-primary"
                          aria-label={`Select all of ${groupLabel(chunk.group)}`}
                        />
                      ) : null}
                      <span className="truncate">{groupLabel(chunk.group)}</span>
                    </div>
                    {chunk.rows.map(renderOption)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
