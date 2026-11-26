import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { type ReactElement, type ReactNode, type RefObject, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { I18nText } from "../i18n/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

/** Px of slack beyond the measured "More" button, so a tab landing exactly at the edge is not pushed into
 * an otherwise empty menu by a rounding difference between measuring and layout. */
const RESERVE_SLACK = 8;

export interface OverflowLayout {
  /** The values that stay in the row. `null` until measured: render everything. */
  inline: ReadonlySet<string> | null;
  /** True when at least one tab sits in the menu. */
  hasOverflow: boolean;
}

/**
 * Decides which tabs stay in the row and which go to the "More" menu, from the measured width of every tab
 * and of the row. The active tab always keeps a slot; the rest are kept in most-recently-active order, so
 * picking a tab from the menu promotes it into the row and the tab that went longest without being active
 * moves out (the row itself stays in declaration order).
 */
export function useTabsOverflow({
  enabled,
  values,
  active,
  wrapRef,
  listRef,
  moreRef,
}: {
  enabled: boolean;
  values: readonly string[];
  active: string | undefined;
  wrapRef: RefObject<HTMLElement | null>;
  listRef: RefObject<HTMLElement | null>;
  moreRef: RefObject<HTMLElement | null>;
}): OverflowLayout {
  const key = values.join("\u0000");
  const [recent, setRecent] = useState<string[]>([]);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [moreWidth, setMoreWidth] = useState(0);
  const [rowWidth, setRowWidth] = useState(0);
  const [gap, setGap] = useState(0);

  useEffect(() => {
    if (!enabled || active == null) return;
    setRecent((prev) => (prev[0] === active ? prev : [active, ...prev.filter((v) => v !== active)]));
  }, [enabled, active]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const list = listRef.current;
    if (!enabled || !wrap || !list) return undefined;
    const measure = (): void => {
      const next: Record<string, number> = {};
      for (const el of Array.from(list.querySelectorAll<HTMLElement>("[data-tab-value]"))) {
        next[el.dataset.tabValue ?? ""] = el.offsetWidth;
      }
      setWidths((prev) => (sameWidths(prev, next) ? prev : next));
      setMoreWidth(moreRef.current?.offsetWidth ?? 0);
      setRowWidth(wrap.clientWidth);
      setGap(parseFloat(getComputedStyle(list).columnGap) || 0);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    for (const el of Array.from(list.querySelectorAll("[data-tab-value]"))) observer.observe(el);
    return () => observer.disconnect();
    // `key`: observe the new tabs when the set changes.
  }, [enabled, key, wrapRef, listRef, moreRef]);

  return useMemo(() => {
    if (!enabled || rowWidth === 0 || values.some((v) => widths[v] === undefined)) return { inline: null, hasOverflow: false };
    const total = values.reduce((sum, v) => sum + (widths[v] ?? 0), 0) + gap * Math.max(0, values.length - 1);
    if (total <= rowWidth) return { inline: new Set(values), hasOverflow: false };

    const known = new Set(values);
    const order = [...recent.filter((v) => known.has(v)), ...values.filter((v) => !recent.includes(v))];
    const budget = rowWidth - moreWidth - RESERVE_SLACK;
    const inline = new Set<string>();
    let used = 0;
    for (const v of order) {
      const need = (widths[v] ?? 0) + (inline.size > 0 ? gap : 0);
      // The active tab always gets a slot, even when it alone does not fit.
      if (v === active || used + need <= budget) {
        inline.add(v);
        used += need;
      }
    }
    return { inline, hasOverflow: inline.size < values.length };
  }, [enabled, rowWidth, widths, moreWidth, gap, values, recent, active]);
}

function sameWidths(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = Object.keys(b);
  return keys.length === Object.keys(a).length && keys.every((k) => a[k] === b[k]);
}

export interface TabsOverflowItem {
  value: string;
  content: ReactNode;
}

/** The "More" button and its menu; picking an entry selects that tab. */
export function TabsOverflowMenu({
  items,
  onSelect,
  hidden,
  buttonClassName,
  buttonRef,
}: {
  items: readonly TabsOverflowItem[];
  onSelect: (value: string) => void;
  /** Rendered (so it can be measured) but out of sight and out of the tab order while everything fits. */
  hidden: boolean;
  buttonClassName: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
}): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={buttonRef}
        data-testid="tabs-overflow"
        aria-hidden={hidden || undefined}
        tabIndex={hidden ? -1 : undefined}
        disabled={hidden}
        className={buttonClassName}
      >
        <I18nText k="tabs.more" />
        <ChevronDownIcon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.value} data-tab-menu-value={item.value} onClick={() => onSelect(item.value)}>
            {item.content}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
