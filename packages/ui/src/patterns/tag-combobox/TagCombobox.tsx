import { XMarkIcon } from "@heroicons/react/24/outline";
import type { ComponentProps, KeyboardEvent, ReactElement, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type ErrorInput, toErrorInfo } from "../../lib/errorState";
import { cn } from "../../lib/utils";
import { InlineError } from "../error-state/ErrorState";
import {
  buildRenderChunks,
  groupCheckState,
  groupMembers,
  type OptionRow,
} from "../../lib/optionGrouping";
import { renderGridOptions, type GridColumn } from "../../lib/optionGrid";
import { Popover, PopoverAnchor, PopoverContent } from "../../primitives/popover";
import { useIntegratedI18n } from "../../i18n/locale";

export interface TagComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Groups this option under a header with the given key, rendered as a bold label
   * plus a tri-state "select all" checkbox (unchecked/checked/indeterminate, reflecting
   * how many of the group's members are selected — toggling it selects or clears the
   * whole group). Options sharing a `group` must be contiguous in `options` — see
   * `Combobox`'s own `group` doc for the same constraint and the reasoning behind it.
   * Ignored when `columns` is set (see that prop's own doc). */
  group?: string;
  /** Extra fields for this option, surfaced as additional columns when
   * `columns` is set — e.g. `{ email: "a@b.com", role: "Admin" }`. Ignored
   * otherwise. */
  data?: Record<string, ReactNode>;
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
  /** The options fetch failed. The list shows an `InlineError` (with Retry when `onRetry` is set) instead of the options. */
  error?: ErrorInput;
  /** Re-runs the failed options fetch. */
  onRetry?: () => void;
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
  /** Renders the popup's option list as a multi-column grid instead of a flat
   * label list — see `Combobox`'s own `columns` doc for the full contract
   * (including its interaction with `group`, and the widened popup). */
  columns?: GridColumn[];
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
const FOCUS_GUARD = "[data-floating-ui-focus-guard],[data-base-ui-focus-guard],[data-radix-focus-guard]";

export function TagCombobox({
  options,
  value,
  onChange,
  placeholder: placeholderProp,
  emptyMessage: emptyMessageProp,
  disabled,
  loading = false,
  loadingMessage: loadingMessageProp,
  error,
  onRetry,
  className,
  id,
  onSearchChange,
  container,
  groupLabels,
  columns,
  ...rest
}: TagComboboxProps): ReactElement {
  const { t } = useIntegratedI18n();
  const placeholder = placeholderProp ?? t("combobox.placeholder");
  const emptyMessage = emptyMessageProp ?? t("combobox.emptyMessage");
  const loadingMessage = loadingMessageProp ?? t("combobox.loadingMessage");
  const testId = rest["data-testid"];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Skipped entirely in grid mode (`columns` set) — see `Combobox`'s own
  // identical `renderChunks` doc for why.
  const renderChunks = useMemo(() => (columns ? [] : buildRenderChunks(visibleOptions)), [visibleOptions, columns]);

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

  const hasError = toErrorInfo(error) !== undefined;

  const TABBABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  /** Moves focus to the first tab stop after the field, skipping the popup, like Tab would with the list closed. */
  function focusAfterField(): void {
    const field = fieldRef.current;
    if (!field) return;
    const scope = field.closest('[role="dialog"]') ?? document.body;
    const stops = Array.from(scope.querySelectorAll<HTMLElement>(TABBABLE)).filter(
      (el) => !contentRef.current?.contains(el) && !el.matches(FOCUS_GUARD) && el.tabIndex >= 0,
    );
    const lastInField = stops.filter((el) => field.contains(el)).at(-1);
    const index = lastInField ? stops.indexOf(lastInField) : -1;
    (stops[index + 1] ?? stops[0])?.focus();
  }

  // Focus moving to something that is neither the field, the list, nor a floating popup's focus guard.
  function leftTheCombobox(next: EventTarget | null): boolean {
    if (!(next instanceof Node)) return false;
    if (next instanceof Element && next.matches(FOCUS_GUARD)) return false;
    return !fieldRef.current?.contains(next) && !contentRef.current?.contains(next);
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
      // The list is replaced by the error line, so the active option is hidden.
      if (option && !hasError) toggleOption(option);
    } else if (event.key === "Escape") {
      if (event.nativeEvent.isComposing) return; // cancels an IME composition, not the list
      // The first Escape closes the option list; the dialog around it stays. Without the stop, the dialog
      // hears the same key right after the list closed (nothing is "above" it anymore) and closes too,
      // taking the user's input with it. With the list already closed, Escape goes on to the dialog.
      if (open) {
        event.stopPropagation();
        setOpen(false);
      }
    } else if (event.key === "Tab") {
      // Close before the browser moves focus: with the list open, the next tab stop is the floating
      // popup's focus guard, and removing it afterwards would drop focus to <body>. Options are reached with
      // the arrow keys, but group toggles have no other keyboard path, so with those in the list Tab flows
      // into it instead and the list closes when focus leaves it.
      if (!contentRef.current?.querySelector("[data-group-header] input")) setOpen(false);
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
              className="inline-flex items-center gap-1 rounded-[var(--radius-pill,9999px)] bg-muted py-0.5 pr-1 pl-2.5 text-xs font-medium text-muted-foreground"
            >
              <span className="max-w-48 truncate">{option.label}</span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={t("tagCombobox.remove", { label: option.label })}
                  className="rounded-[var(--radius-pill,9999px)] p-0.5 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeValue(option.value);
                  }}
                >
                  <XMarkIcon className="h-3 w-3" />
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
            onBlur={(event) => {
              // Focus moved on (Tab, code): close. A `null` target is a click on something that cannot take
              // focus (Safari does not focus buttons), which an outside press or an option click handles.
              if (leftTheCombobox(event.relatedTarget)) setOpen(false);
            }}
            onChange={(event) => updateSearch(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        ref={contentRef}
        onBlur={(event) => {
          // Tabbing out of the list (group toggles are tab stops) closes it like leaving the input does.
          const next = event.relatedTarget;
          if (next instanceof Element && next.matches(FOCUS_GUARD) && contentRef.current) {
            // Ran off an end of the list onto the popup's focus guard: take focus ourselves, because the guard
            // would otherwise send it to <body> and out of the dialog when the list closes.
            const leading = Boolean(next.compareDocumentPosition(contentRef.current) & Node.DOCUMENT_POSITION_FOLLOWING);
            if (leading) inputRef.current?.focus();
            else focusAfterField();
            setOpen(false);
          } else if (leftTheCombobox(next)) setOpen(false);
        }}
        align="start"
        container={container}
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[10rem] p-2",
          columns && "w-max min-w-[var(--radix-popover-trigger-width)] max-w-[min(40rem,90vw)]",
        )}
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
        <div role={hasError ? undefined : "listbox"} className={cn("max-h-60 overflow-y-auto", !columns && "flex flex-col gap-0.5")}>
          {loading ? (
            <p className="py-2 text-center text-sm text-muted-foreground">{loadingMessage}</p>
          ) : hasError ? (
            <div className="flex justify-center py-2">
              <InlineError error={error} onRetry={onRetry} />
            </div>
          ) : visibleOptions.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : columns ? (
            renderGridOptions({
              columns,
              options: visibleOptions,
              activeIndex,
              multiple: true,
              isSelected: (option) => value.includes(option.value),
              onSelect: toggleOption,
              onHover: setActiveIndex,
              testId,
            })
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
                      aria-label={t("combobox.selectAllOfGroup", { group: groupLabel(chunk.group) })}
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
