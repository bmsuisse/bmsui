import { X } from "lucide-react";
import type { ComponentProps, KeyboardEvent, ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import {
  buildRenderChunks,
  groupCheckState,
  groupMembers,
  type OptionRow,
} from "../../lib/optionGrouping";
import { Popover, PopoverAnchor, PopoverContent } from "../../primitives/popover";

export interface TagComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Groups this option under a header with the given key, rendered as a bold label
   * plus a tri-state "select all" checkbox (unchecked/checked/indeterminate, reflecting
   * how many of the group's members are selected — toggling it selects or clears the
   * whole group). Options sharing a `group` must be contiguous in `options` — see
   * `Combobox`'s own `group` doc for the same constraint and the reasoning behind it. */
  group?: string;
}

export interface TagComboboxProps {
  /** The full option list. Filtering happens client-side against `label`,
   * unless `onSearchChange` is given (see below). */
  options: TagComboboxOption[];
  /** Selected options' `value`s. */
  value: string[];
  /** Called with the full updated selection after a toggle or a chip removal. */
  onChange: (value: string[]) => void;
  /** Shown in the field when nothing is selected and nothing is typed. Defaults to `"Select…"`. */
  placeholder?: string;
  /** Shown when the search term matches nothing. Defaults to `"No matches."`. */
  emptyMessage?: string;
  disabled?: boolean;
  /** Shows `loadingMessage` in the option list instead of `emptyMessage`, for a
   * combobox whose `options` are still being fetched (e.g. a server search whose
   * request hasn't resolved yet). Defaults to `false`. */
  loading?: boolean;
  /** Message shown in the option list while `loading` is true. Defaults to `"Loading…"`. */
  loadingMessage?: string;
  className?: string;
  id?: string;
  /** Forwarded to the field, for test targeting (e.g. Playwright/Testing Library). */
  "data-testid"?: string;
  /** Switches the search input to server-driven mode: called with the raw search
   * text on every keystroke, and `options` is rendered as-is instead of being
   * filtered locally against `label`. Omit for the default client-side filtering
   * behavior — see `Combobox`'s own `onSearchChange` for the same contract. */
  onSearchChange?: (search: string) => void;
  /** Portal target for the popover, forwarded to the underlying `PopoverContent`.
   * Needed when the combobox is opened from inside a modal Dialog/Sheet — pass the
   * Dialog/Sheet content element so the popover portals inside it instead of
   * `document.body`, which would otherwise fight with the Dialog's focus trap. */
  container?: ComponentProps<typeof PopoverContent>["container"];
  /** Display label for a group key (`TagComboboxOption.group`). Falls back to the raw
   * key when an entry is missing. Only relevant when at least one option sets `group`. */
  groupLabels?: Record<string, string>;
}

/**
 * A tags-and-search multi-select: selected options render as removable chips
 * inline inside one bordered field, with a search input immediately after
 * the last chip. Typing opens a popover listing matches below the field;
 * picking one adds a chip right where the caret was and clears the search
 * term so the user can keep typing. Complements `Combobox`'s `multiple`
 * mode (a trigger button + a summary count) for the case where every
 * individual selection needs to stay visible and removable at a glance —
 * built on the same `Popover`/keyboard-nav shape rather than forking it,
 * so both patterns share one mental model.
 */
export function TagCombobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  emptyMessage = "No matches.",
  disabled,
  loading = false,
  loadingMessage = "Loading…",
  className,
  id,
  onSearchChange,
  container,
  groupLabels,
  ...rest
}: TagComboboxProps): ReactElement {
  const testId = rest["data-testid"];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  const selectedOptions = useMemo(
    () => value.map((v) => options.find((o) => o.value === v) ?? { value: v, label: v }),
    [options, value],
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

  useEffect(() => {
    setActiveIndex((i) => Math.min(Math.max(i, 0), Math.max(visibleOptions.length - 1, 0)));
  }, [visibleOptions.length]);

  const renderChunks = useMemo(() => buildRenderChunks(visibleOptions), [visibleOptions]);

  // Reset the search term and re-point `activeIndex` each time the popover
  // opens -- intentionally NOT reactive to `options`/`value` changes while it
  // stays open, only to the open transition itself, mirroring `Combobox`'s
  // own identical effect. Harmless (and idempotent) when `open` becomes true
  // via focus right before the user starts typing: search is already "" at
  // that point, since typing is what would change it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    setSearch("");
    onSearchChange?.("");
    const firstSelected = value[0];
    const selectedIdx = firstSelected ? options.findIndex((o) => o.value === firstSelected) : -1;
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
  }, [open]);

  function updateSearch(next: string): void {
    setSearch(next);
    onSearchChange?.(next);
    if (!open) setOpen(true);
  }

  function toggleOption(option: TagComboboxOption): void {
    if (option.disabled) return;
    const next = value.includes(option.value) ? value.filter((v) => v !== option.value) : [...value, option.value];
    onChange(next);
    updateSearch("");
    inputRef.current?.focus();
  }

  function removeValue(v: string): void {
    // Mirrors toggleOption's own guard: an option disabled in the caller's
    // `options` list can't be deselected via its dropdown row, so its chip's
    // own remove button (and the Backspace shortcut, which calls this too)
    // must refuse it the same way instead of silently bypassing that.
    if (options.find((o) => o.value === v)?.disabled) return;
    onChange(value.filter((existing) => existing !== v));
  }

  const groupLabel = (group: string): string => groupLabels?.[group] ?? group;

  // Deliberately uses the full `options` list, not `visibleOptions` -- a
  // group's checkbox/toggle must reflect and act on every member, including
  // ones the current search term is hiding, matching `Combobox`'s own
  // `toggleGroup`/header-state contract for the same reason.
  function toggleGroup(group: string): void {
    const members = groupMembers(options, group);
    const next =
      groupCheckState(options, value, group) === "checked"
        ? value.filter((v) => !members.includes(v))
        : Array.from(new Set([...value, ...members]));
    onChange(next);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(visibleOptions.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) toggleOption(option);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && search === "") {
      // Standard tag-input convention: Backspace on an empty search field
      // removes the most recently added chip instead of doing nothing.
      const last = value[value.length - 1];
      if (last !== undefined) removeValue(last);
    }
  }

  function renderOption({ option, index }: OptionRow<TagComboboxOption>): ReactElement {
    const isSelected = value.includes(option.value);
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
        onClick={() => toggleOption(option)}
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none disabled:pointer-events-none disabled:opacity-50",
          isActive && "bg-accent text-accent-foreground",
        )}
      >
        <input
          type="checkbox"
          checked={isSelected}
          readOnly
          tabIndex={-1}
          className="pointer-events-none h-3.5 w-3.5 shrink-0 accent-primary"
        />
        <span className="truncate">{option.label}</span>
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          ref={fieldRef}
          data-testid={testId}
          role="combobox"
          aria-expanded={open}
          aria-disabled={disabled}
          className={cn(
            "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
          onClick={() => {
            if (!disabled) inputRef.current?.focus();
          }}
        >
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 text-xs font-medium text-muted-foreground"
            >
              <span className="max-w-48 truncate">{option.label}</span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${option.label}`}
                  className="rounded-full p-0.5 hover:bg-accent hover:text-accent-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeValue(option.value);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            value={search}
            disabled={disabled}
            placeholder={selectedOptions.length === 0 ? placeholder : undefined}
            aria-label={placeholder}
            className="min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            onFocus={() => setOpen(true)}
            onChange={(event) => updateSearch(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        container={container}
        className="w-[var(--radix-popover-trigger-width)] min-w-[10rem] p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // Radix's non-modal Popover content treats a focus/pointer event as
        // "outside" (and dismisses) unless the target is inside the content
        // itself or is the registered `PopoverTrigger` -- but this field uses
        // `PopoverAnchor`, which never registers a trigger ref, and
        // `toggleOption`/`removeValue` deliberately refocus `inputRef` (which
        // lives in the anchor, not inside this portaled content) after every
        // pick so the user can keep typing. Without this guard, that refocus
        // itself reads as "focus left to somewhere outside" and closes the
        // popover right after each selection.
        onInteractOutside={(event) => {
          if (fieldRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
      >
        <div role="listbox" className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {loading ? (
            <p className="py-2 text-center text-sm text-muted-foreground">{loadingMessage}</p>
          ) : renderChunks.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            renderChunks.map((chunk) => {
              if (chunk.kind === "single") return renderOption(chunk.row);
              const headerState = groupCheckState(options, value, chunk.group);
              return (
                // The header and every one of its group's rows share this wrapper -- its
                // bounds are the sticky header's containing block, so `sticky top-0` keeps
                // the header pinned for the group's whole scroll extent instead of just
                // past its first row. Spacing above a group lives on this wrapper's
                // `pt-1`/`first:pt-0`, not on the header itself -- see `Combobox`'s own
                // identical structure for why both of these matter.
                <div key={`group-${chunk.group}`} className="flex flex-col gap-0.5 pt-1 first:pt-0">
                  <div
                    data-group-header
                    className="sticky top-0 z-10 flex items-center gap-2 rounded-sm bg-muted px-2 py-1.5 text-sm font-semibold text-foreground"
                  >
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
                    <span className="truncate">{groupLabel(chunk.group)}</span>
                  </div>
                  {chunk.rows.map(renderOption)}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
