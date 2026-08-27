import { X } from "lucide-react";
import type { ComponentProps, KeyboardEvent, ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "../../primitives/popover";

export interface TagComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
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
    setActiveIndex((i) => Math.min(i, Math.max(visibleOptions.length - 1, 0)));
  }, [visibleOptions.length]);

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
    onChange(value.filter((existing) => existing !== v));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, visibleOptions.length - 1));
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent
        align="start"
        container={container}
        className="w-[var(--radix-popover-trigger-width)] min-w-[10rem] p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div role="listbox" className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {loading ? (
            <p className="py-2 text-center text-sm text-muted-foreground">{loadingMessage}</p>
          ) : visibleOptions.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            visibleOptions.map((option, index) => {
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
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
