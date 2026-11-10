import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ButtonHTMLAttributes, KeyboardEvent, ReactElement, ReactNode } from "react";
import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../primitives/dialog";
import { EmptyState } from "../empty-state/EmptyState";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";
import { scoreCommand } from "./commandFilter";
import { useRegisteredCommands } from "./registry";
import type { CommandItem } from "./types";

export interface CommandPaletteLabels {
  /** Dialog title (screen readers only) and the list's accessible name. */
  title: string;
  /** Dialog description (screen readers only). */
  description: string;
  placeholder: string;
  empty: string;
  /** Section header of the recent commands. */
  recent: string;
  /** Footer hints. */
  navigate: string;
  run: string;
  close: string;
  loading: string;
}

export const defaultCommandPaletteLabels: CommandPaletteLabels = {
  title: "Command palette",
  description: "Search for a command and press Enter to run it.",
  placeholder: "Type a command or search…",
  empty: "No matching commands",
  recent: "Recent",
  navigate: "navigate",
  run: "run",
  close: "close",
  loading: "Loading…",
};

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Commands to list. Merged with the ones registered via `useRegisterCommands` (registered last). */
  commands?: CommandItem[];
  /** Command ids listed first under "Recent" while the query is empty (see `useRecentCommands`). */
  recent?: string[];
  /** Called after a command ran — e.g. `push` from `useRecentCommands`. */
  onCommandRun?: (command: CommandItem) => void;
  /** Order of the group sections; groups not listed follow in first-seen order. */
  groupOrder?: string[];
  /** Custom match score (0 = hidden, higher first). Defaults to a fuzzy-ish label/keyword match. */
  filter?: (command: CommandItem, query: string) => number;
  /** Called on every keystroke, for adding server results to `commands`. */
  onQueryChange?: (query: string) => void;
  /** Shows a spinner in the input while server results load. */
  loading?: boolean;
  /** Replaces the keyboard-hint footer. `null` hides it. */
  footer?: ReactNode;
  labels?: Partial<CommandPaletteLabels>;
  className?: string;
  "data-testid"?: string;
}

interface Section {
  key: string;
  label: string;
  rows: { command: CommandItem; index: number }[];
}

/**
 * ⌘K / Ctrl+K command palette: a dialog with a search box over grouped
 * commands (icon, label, shortcut hint), a fuzzy-ish filter, optional recent
 * commands, arrow keys + Enter, and an empty state. Use it as the app-wide
 * "do anything" box; open it with `useCommandPaletteHotkey` and/or a
 * `CommandPaletteTrigger` in the top bar. Pages can add their own commands
 * through `CommandRegistryProvider` + `useRegisterCommands`. Built on `Dialog`
 * with its own list (no cmdk), keyboard handled on the input via
 * `aria-activedescendant`, like `Combobox`.
 */
export function CommandPalette({
  open,
  onOpenChange,
  className,
  "data-testid": testId = "command-palette",
  ...rest
}: CommandPaletteProps): ReactElement {
  const l = { ...defaultCommandPaletteLabels, ...rest.labels };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        data-testid={testId}
        className={cn(
          "top-4 w-[calc(100%-2rem)] max-w-xl translate-y-0 rounded-xl border-border shadow-2xl sm:top-[12vh]",
          "max-h-[min(36rem,calc(100dvh-2rem))] sm:max-h-[min(36rem,76vh)]",
          className,
        )}
      >
        <DialogTitle className="sr-only">{l.title}</DialogTitle>
        <DialogDescription className="sr-only">{l.description}</DialogDescription>
        <PaletteBody {...rest} labels={l} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({
  commands: ownCommands,
  recent,
  onCommandRun,
  groupOrder,
  filter,
  onQueryChange,
  loading,
  footer,
  labels: l,
  onClose,
}: Omit<CommandPaletteProps, "open" | "onOpenChange" | "className" | "data-testid" | "labels"> & {
  labels: CommandPaletteLabels;
  onClose: () => void;
}): ReactElement {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const registered = useRegisteredCommands();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const sections = useMemo<Section[]>(() => {
    const all = [...(ownCommands ?? []), ...registered];
    const trimmed = query.trim();
    const byId = new Map(all.map((c) => [c.id, c]));
    const recentCommands = !trimmed && recent ? recent.map((id) => byId.get(id)).filter((c): c is CommandItem => !!c) : [];
    const recentIds = new Set(recentCommands.map((c) => c.id));

    const scored = all
      .filter((c) => !recentIds.has(c.id))
      .map((command, order) => ({
        command,
        order,
        score: filter ? filter(command, trimmed) : scoreCommand(trimmed, command.label, command.keywords),
      }))
      .filter((s) => s.score > 0);

    const groups = new Map<string, typeof scored>();
    for (const s of scored) {
      const key = s.command.group ?? "";
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    }
    const orderIndex = (key: string): number => {
      const i = groupOrder?.indexOf(key) ?? -1;
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    let groupList = Array.from(groups.entries()).map(([key, items], firstSeen) => ({
      key,
      items: trimmed ? [...items].sort((a, b) => b.score - a.score || a.order - b.order) : items,
      best: Math.max(...items.map((s) => s.score)),
      firstSeen,
    }));
    groupList = groupList.sort((a, b) =>
      trimmed
        ? b.best - a.best || orderIndex(a.key) - orderIndex(b.key) || a.firstSeen - b.firstSeen
        : orderIndex(a.key) - orderIndex(b.key) || a.firstSeen - b.firstSeen,
    );

    let index = 0;
    const result: Section[] = [];
    if (recentCommands.length > 0) {
      result.push({
        key: "__recent",
        label: l.recent,
        rows: recentCommands.map((command) => ({ command, index: index++ })),
      });
    }
    for (const g of groupList) {
      result.push({ key: g.key, label: g.key, rows: g.items.map((s) => ({ command: s.command, index: index++ })) });
    }
    return result;
  }, [ownCommands, registered, query, recent, filter, groupOrder, l.recent]);

  const flat = useMemo(() => sections.flatMap((s) => s.rows.map((r) => r.command)), [sections]);
  const count = flat.length;
  const activeIndex = Math.min(active, Math.max(count - 1, 0));
  const current = flat[activeIndex];

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const run = (command: CommandItem | undefined): void => {
    if (!command || command.disabled) return;
    onClose();
    onCommandRun?.(command);
    void command.onSelect();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const down = event.key === "ArrowDown" || (event.ctrlKey && event.key === "n");
    const up = event.key === "ArrowUp" || (event.ctrlKey && event.key === "p");
    if ((down || up) && count > 0) {
      event.preventDefault();
      setActive((activeIndex + (down ? 1 : -1) + count) % count);
    } else if (event.key === "PageDown" || event.key === "PageUp") {
      event.preventDefault();
      setActive(event.key === "PageDown" ? Math.max(count - 1, 0) : 0);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      run(current);
    }
  };

  const optionId = (index: number): string => `${baseId}-option-${index}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-[var(--dialog-divider)] px-4">
        {loading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <input
          // biome-ignore lint/a11y/noAutofocus: the palette exists to be typed into
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={current ? optionId(activeIndex) : undefined}
          aria-label={l.title}
          aria-busy={loading || undefined}
          data-testid="command-palette-input"
          value={query}
          placeholder={l.placeholder}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            onQueryChange?.(event.target.value);
          }}
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Kbd className="max-sm:hidden">Esc</Kbd>
      </div>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={l.title}
        data-testid="command-palette-list"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
      >
        {count === 0 ? (
          loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{l.loading}</p>
          ) : (
            <EmptyState size="sm" icon={MagnifyingGlassIcon} title={l.empty} className="py-8" data-testid="command-palette-empty" />
          )
        ) : (
          sections.map((section, sectionIndex) => {
            // Group names can contain spaces/punctuation; ids built from them would break aria-labelledby.
            const headerId = `${baseId}-group-${sectionIndex}`;
            return (
              <div
                key={section.key}
                role="group"
                aria-labelledby={section.label ? headerId : undefined}
                className="pb-1 last:pb-0"
              >
                {section.label ? (
                  <div
                    id={headerId}
                    role="presentation"
                    className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {section.label}
                  </div>
                ) : null}
                {section.rows.map(({ command, index }) => (
                  <Option
                    key={command.id}
                    id={optionId(index)}
                    index={index}
                    command={command}
                    active={index === activeIndex}
                    onHover={() => setActive(index)}
                    onRun={() => run(command)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
      {footer === undefined ? (
        <div className="flex shrink-0 items-center gap-4 border-t border-[var(--dialog-divider)] bg-muted/50 px-4 py-2 text-xs text-muted-foreground max-sm:hidden">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {l.navigate}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            {l.run}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            {l.close}
          </span>
        </div>
      ) : footer === null ? null : (
        <div className="shrink-0 border-t border-[var(--dialog-divider)] px-4 py-2 text-xs text-muted-foreground">{footer}</div>
      )}
    </div>
  );
}

function Option({
  id,
  index,
  command,
  active,
  onHover,
  onRun,
}: {
  id: string;
  index: number;
  command: CommandItem;
  active: boolean;
  onHover: () => void;
  onRun: () => void;
}): ReactElement {
  const Icon = command.icon;
  const disabled = Boolean(command.disabled);
  const reason = typeof command.disabled === "string" ? command.disabled : null;
  const keys = command.shortcut == null ? [] : Array.isArray(command.shortcut) ? command.shortcut : [command.shortcut];
  return (
    // The input owns the keyboard (combobox pattern); options only take the pointer.
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by the combobox input
    <div
      id={id}
      role="option"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      data-index={index}
      data-testid="command-palette-item"
      data-command={command.id}
      onMouseMove={active ? undefined : onHover}
      onClick={onRun}
      className={cn(
        "flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-md px-2.5 py-2 text-sm text-foreground",
        active && "bg-foreground/[0.06] dark:bg-foreground/10",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
      <span className="min-w-0 truncate">{command.label}</span>
      {command.description ? (
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{command.description}</span>
      ) : (
        <span className="flex-1" />
      )}
      {reason ? <span className="shrink-0 text-xs text-muted-foreground">{reason}</span> : null}
      {keys.length > 0 ? (
        <span className="flex shrink-0 items-center gap-1 max-sm:hidden">
          {keys.map((key, i) => (
            <Kbd key={i}>{key}</Kbd>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function Kbd({ children, className }: { children: ReactNode; className?: string }): ReactElement {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded border border-foreground/15 bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export interface UseCommandPaletteHotkeyOptions {
  /** Letter pressed together with ⌘ (macOS) or Ctrl. @default "k" */
  key?: string;
  /** Turn the listener off (e.g. while another modal owns the keyboard). @default true */
  enabled?: boolean;
}

/**
 * Calls `handler` on ⌘K (macOS) / Ctrl+K (elsewhere — either modifier works
 * everywhere) and stops the browser's own binding. Usually
 * `useCommandPaletteHotkey(() => setOpen((o) => !o))`.
 */
export function useCommandPaletteHotkey(handler: () => void, options: UseCommandPaletteHotkeyOptions = {}): void {
  const { key = "k", enabled = true } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key?.toLowerCase() !== key.toLowerCase() || !(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey || event.repeat) return;
      event.preventDefault();
      handlerRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled]);
}

/** The palette shortcut as shown to this user: "⌘K" on Apple devices, "Ctrl K" elsewhere. */
export function formatCommandPaletteShortcut(key = "K"): string {
  return isApplePlatform() ? `⌘${key.toUpperCase()}` : `Ctrl ${key.toUpperCase()}`;
}

export interface CommandPaletteTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text in the pill. @default "Search…" */
  label?: string;
  /** Shortcut hint on the right. Defaults to `formatCommandPaletteShortcut()`; `null` hides it. */
  shortcut?: string | null;
}

/**
 * Search-pill button for the top bar that opens the `CommandPalette` and shows
 * its shortcut. Collapses to an icon button below `sm`.
 */
export const CommandPaletteTrigger = forwardRef<HTMLButtonElement, CommandPaletteTriggerProps>(
  ({ label = "Search…", shortcut, className, ...props }, ref) => {
    const [hint, setHint] = useState<string | null>(shortcut === undefined ? null : shortcut);
    // Resolved after mount so server and client render the same markup.
    useEffect(() => {
      setHint(shortcut === undefined ? formatCommandPaletteShortcut() : shortcut);
    }, [shortcut]);
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-keyshortcuts={hint ? (isApplePlatform() ? "Meta+K" : "Control+K") : undefined}
        data-testid="command-palette-trigger"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:w-9 max-sm:justify-center max-sm:px-0 sm:min-w-56",
          className,
        )}
        {...props}
      >
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left max-sm:sr-only">{label}</span>
        {hint ? <Kbd className="max-sm:hidden">{hint}</Kbd> : null}
      </button>
    );
  },
);
CommandPaletteTrigger.displayName = "CommandPaletteTrigger";

const RECENT_PREFIX = "bmsui:recent-commands:";

/**
 * Most-recently-run command ids, persisted in `localStorage` under
 * `storageKey` (best effort — private mode or blocked storage just keeps them
 * in memory). Feed `recent` to `CommandPalette.recent` and `push` to
 * `onCommandRun`.
 */
export function useRecentCommands(
  storageKey: string,
  max = 5,
): { recent: string[]; push: (command: CommandItem | string) => void; clear: () => void } {
  const fullKey = RECENT_PREFIX + storageKey;
  // Start empty and read storage after mount so server and client markup match.
  const [recent, setRecent] = useState<string[]>(EMPTY_RECENT);
  useEffect(() => {
    setRecent(readRecent(fullKey));
  }, [fullKey]);
  const write = useCallback(
    (next: string[]) => {
      setRecent(next);
      try {
        window.localStorage.setItem(fullKey, JSON.stringify(next));
      } catch {
        // storage unavailable: keep the in-memory list
      }
    },
    [fullKey],
  );
  const push = useCallback(
    (command: CommandItem | string) => {
      const id = typeof command === "string" ? command : command.id;
      setRecent((prev) => {
        const next = [id, ...prev.filter((x) => x !== id)].slice(0, max);
        try {
          window.localStorage.setItem(fullKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [fullKey, max],
  );
  const clear = useCallback(() => write([]), [write]);
  return { recent, push, clear };
}

const EMPTY_RECENT: string[] = [];

function readRecent(key: string): string[] {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
