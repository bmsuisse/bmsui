import { ChevronDown } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../primitives/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";

export interface TabStripTab {
  /** Unique id, used as the underlying `Tabs.Trigger`/`Tabs.Content` value and as the
   * `value`/`onValueChange` payload. */
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabStripProps {
  /**
   * Tabs to render, in display order. TabStrip never decides which tabs exist or in
   * what order that stays entirely with the caller, so a saved per-user tab
   * selection/order (from a settings screen, an API preference, localStorage, ...) is
   * just whatever subset/order of `TabStripTab`s the caller passes in here. TabStrip's
   * own job starts after that: given however many tabs it was handed, show as many as
   * fit the available width inline and collapse the rest behind "More".
   */
  tabs: TabStripTab[];
  /** Id of the active tab. Must match one entry's `id`. */
  value: string;
  /** Called with a tab's `id` when the user activates it, from the inline strip or from
   * the "More" menu. */
  onValueChange: (id: string) => void;
  /** Label for the overflow trigger, before the `(<n>)` count suffix. Defaults to `"More"`. */
  moreLabel?: string;
  className?: string;
  /** Applied to the inline tab strip itself (not the overflow menu). */
  listClassName?: string;
  "data-testid"?: string;
}

const TRIGGER_CLASS_NAME =
  "inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium";

const MORE_BUTTON_CLASS_NAME = cn(
  TRIGGER_CLASS_NAME,
  "text-foreground/60 transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-background data-[state=open]:text-foreground",
);

/**
 * Given each tab's natural (unwrapped) width, decides how many fit `containerWidth`
 * before the rest have to collapse into "More". Kept as a pure function, separate
 * from the DOM measuring in `TabStrip` itself, because jsdom never lays elements out
 * (every width is 0 in tests) so this is the only part of the overflow behavior that
 * can be verified directly with fabricated widths.
 *
 * `containerWidth <= 0` (not measured yet, e.g. first paint) renders everything
 * inline rather than guessing — a brief overflow is preferable to a flash of
 * everything hidden behind "More".
 */
export function computeTabStripLayout(
  order: string[],
  widths: Map<string, number>,
  containerWidth: number,
  moreButtonWidth: number,
  activeId: string,
): { visibleIds: string[]; overflowIds: string[] } {
  if (containerWidth <= 0 || order.length === 0) {
    return { visibleIds: order, overflowIds: [] };
  }

  const totalWidth = order.reduce((sum, id) => sum + (widths.get(id) ?? 0), 0);
  if (totalWidth <= containerWidth) {
    return { visibleIds: order, overflowIds: [] };
  }

  const budget = containerWidth - moreButtonWidth;
  let used = 0;
  let cutoff = 0;
  while (cutoff < order.length) {
    const width = widths.get(order[cutoff] as string) ?? 0;
    // The first tab always gets in, even over budget alone, so the strip is never empty.
    if (cutoff > 0 && used + width > budget) break;
    used += width;
    cutoff++;
  }

  let visible = new Set(order.slice(0, cutoff));
  let overflow = order.filter((id) => !visible.has(id));

  // A resize that pushes the active tab out of the inline strip must not hide it
  // behind "More" — swap it back in for whichever tab is currently last inline.
  if (overflow.includes(activeId) && visible.size > 0) {
    const lastVisible = order.filter((id) => visible.has(id)).at(-1) as string;
    visible = new Set([...Array.from(visible).filter((id) => id !== lastVisible), activeId]);
    overflow = order.filter((id) => !visible.has(id));
  }

  return {
    visibleIds: order.filter((id) => visible.has(id)),
    overflowIds: overflow,
  };
}

/**
 * A responsive tab strip: renders as many `tabs` as fit the available width inline,
 * collapsing the rest into a "More" dropdown modeled on OneSales' customer-detail
 * tabstrip. Deliberately takes no opinion on *which* tabs exist or their order (see
 * the `tabs` prop doc) leaving persistence of a per-user tab selection entirely to
 * the caller; this component only owns the responsive inline/overflow split.
 *
 * Built on this package's own `Tabs` primitives (Radix under the hood): a `TabsContent`
 * call site exists for every tab, but only the active tab's `content` actually mounts
 * into the DOM (Radix's default, un-`forceMount`ed behavior) — other tabs' content
 * never renders until first activated, and unmounts again once you navigate away, so
 * this is lazy-mount rather than keep-alive. Because `value` itself doesn't change
 * when a resize reshuffles which tabs are inline vs. overflowed, the active tab's
 * mounted content survives that reshuffle even though it's lazy across tab switches.
 */
export function TabStrip(props: TabStripProps): ReactElement {
  const { tabs, value, onValueChange, moreLabel = "More", className, listClassName } = props;
  const testId = props["data-testid"];

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRefs = useRef(new Map<string, HTMLElement>());
  const moreMeasureRef = useRef<HTMLButtonElement>(null);

  const [layout, setLayout] = useState<{ visibleIds: string[]; overflowIds: string[] }>(() => ({
    visibleIds: tabs.map((tab) => tab.id),
    overflowIds: [],
  }));

  // Re-measures on mount/resize and whenever the tab set or active tab changes.
  // `useLayoutEffect` (not `useEffect`) so the initial layout is settled before
  // paint instead of flashing every tab inline first.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function recompute(): void {
      const containerWidth = container?.getBoundingClientRect().width ?? 0;
      const widths = new Map<string, number>();
      for (const tab of tabs) {
        const el = measureRefs.current.get(tab.id);
        if (el) widths.set(tab.id, el.getBoundingClientRect().width);
      }
      const moreWidth = moreMeasureRef.current?.getBoundingClientRect().width ?? 0;
      setLayout(
        computeTabStripLayout(
          tabs.map((tab) => tab.id),
          widths,
          containerWidth,
          moreWidth,
          value,
        ),
      );
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    return () => observer.disconnect();
  }, [tabs, value]);

  const tabsById = new Map(tabs.map((tab) => [tab.id, tab]));
  const visibleTabs = layout.visibleIds.map((id) => tabsById.get(id)).filter((tab): tab is TabStripTab => !!tab);
  const overflowTabs = layout.overflowIds.map((id) => tabsById.get(id)).filter((tab): tab is TabStripTab => !!tab);

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <div ref={containerRef} data-tabstrip-container="" className="relative w-full">
        <TabsList className={cn("w-full justify-start overflow-hidden bg-muted", listClassName)}>
          {visibleTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              disabled={tab.disabled}
              data-testid={testId ? `${testId}-tab-${tab.id}` : undefined}
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}

          {overflowTabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={MORE_BUTTON_CLASS_NAME}
                  data-testid={testId ? `${testId}-more` : undefined}
                >
                  {moreLabel} ({overflowTabs.length})
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {overflowTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.id}
                    disabled={tab.disabled}
                    onSelect={() => onValueChange(tab.id)}
                    className={cn(tab.id === value && "bg-accent text-accent-foreground")}
                    data-testid={testId ? `${testId}-more-item-${tab.id}` : undefined}
                  >
                    {tab.icon}
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TabsList>

        {/* Off-screen clones of every tab (styled identically to the real triggers) used
            only to read natural widths before deciding what fits. `TabsTrigger` itself
            isn't reused here — a second `Tabs.Trigger` per value would register twice
            with Radix's roving-tabindex/active-state tracking. */}
        <div aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 flex h-0 overflow-hidden">
          {tabs.map((tab) => (
            <span
              key={tab.id}
              data-tabstrip-measure={tab.id}
              ref={(el) => {
                if (el) measureRefs.current.set(tab.id, el);
                else measureRefs.current.delete(tab.id);
              }}
              className={TRIGGER_CLASS_NAME}
            >
              {tab.icon}
              {tab.label}
            </span>
          ))}
          <button
            ref={moreMeasureRef}
            type="button"
            tabIndex={-1}
            data-tabstrip-measure="__more__"
            className={MORE_BUTTON_CLASS_NAME}
          >
            {moreLabel} ({tabs.length})
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
