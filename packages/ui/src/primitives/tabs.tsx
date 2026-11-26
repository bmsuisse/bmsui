import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import {
  Children,
  type ComponentPropsWithoutRef,
  type ReactElement,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useMergedRefs } from "../hooks/useMergedRefs";
import { slot, useControllable } from "../lib/radixCompat";
import { useScrollFade } from "../lib/scrollFade";
import { cn } from "../lib/utils";
import { TabsOverflowMenu, useTabsOverflow } from "./tabs-overflow";

export type TabsVariant = "pill" | "underline" | "chips";
export type TabsCountTone = "danger" | "warning";
/** What a row of tabs that does not fit does: `scroll` sideways, or move the rest into a `menu` ("More"). */
export type TabsOverflow = "scroll" | "menu";

interface TabsContextValue {
  value: string | undefined;
  setValue: (value: string) => void;
  activationMode: "automatic" | "manual";
  variant: TabsVariant;
  overflow: TabsOverflow;
}
const TabsContext = createContext<TabsContextValue>({
  value: undefined,
  setValue: () => {},
  activationMode: "automatic",
  variant: "pill",
  overflow: "scroll",
});
const tabState = (ctx: TabsContextValue, value: string) => (ctx.value === value ? "active" : "inactive");

export interface TabsProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  /** `automatic` (default): arrow keys activate the focused tab. `manual`: Enter/Space does. */
  activationMode?: "automatic" | "manual";
  /**
   * `pill` (default): segmented control, grey track with a raised active tab; for a handful of short
   * views inside a card or panel. `underline`: a hairline under the list and a primary underline on the
   * active tab; for the sections of a page, sheet or modal, scrolls sideways instead of wrapping.
   * `chips`: separate rounded chips, the active one inverted; one swipeable row (with an edge fade) on a phone,
   * wrapping from `md` up; for filters and lanes ("All / Open / Overdue") above a list.
   */
  variant?: TabsVariant;
  /**
   * What `underline` and `chips` rows do when the tabs do not fit. `scroll` (default): the row swipes sideways.
   * `menu`: as many tabs as fit stay in the row, the rest move into a "More" menu; the active tab always keeps a
   * place in the row, and the tab that went longest without being used moves out when another is picked from
   * the menu. `menu` needs `TabsTrigger`s as direct children of `TabsList`. Make it a user setting if you like.
   */
  overflow?: TabsOverflow;
  asChild?: boolean;
}

const listClass: Record<TabsVariant, string> = {
  pill: "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
  // Scrolls sideways when the tabs do not fit; the scrollbar stays out of the way.
  underline:
    "flex w-full min-w-0 items-end justify-start gap-1 overflow-x-auto border-b border-border text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  chips:
    "flex w-full min-w-0 items-center justify-start gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-x-visible",
};

const triggerClass: Record<TabsVariant, string> = {
  pill: "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium text-foreground/60 transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  // `-mb-px` lets the active underline sit on the list's hairline instead of above it.
  underline:
    "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=active]:border-primary data-[state=active]:text-foreground max-md:min-h-11",
  chips:
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=active]:bg-foreground data-[state=active]:text-background max-md:h-11 md:h-8 md:rounded-lg md:px-3 md:text-xs",
};

const countClass: Record<TabsVariant, string> = {
  pill: "rounded-full bg-muted px-1.5 text-[11px] font-normal tabular-nums text-muted-foreground",
  underline: "rounded-full bg-muted px-1.5 text-[11px] font-normal tabular-nums text-muted-foreground",
  chips:
    "min-w-5 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-center text-xs font-bold tabular-nums group-data-[state=active]/tab:bg-background/20 group-data-[state=active]/tab:text-background md:min-w-0 md:text-[10px]",
};

const toneClass: Record<TabsCountTone, string> = {
  danger: "!bg-destructive/15 !text-destructive group-data-[state=active]/tab:!bg-background/20 group-data-[state=active]/tab:!text-background",
  warning:
    "!bg-amber-500/15 !text-amber-700 dark:!text-amber-400 group-data-[state=active]/tab:!bg-background/20 group-data-[state=active]/tab:!text-background",
};

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      orientation = "horizontal",
      activationMode = "automatic",
      variant = "pill",
      overflow = "scroll",
      asChild,
      children,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllable<string | undefined>(valueProp, defaultValue, onValueChange as (v?: string) => void);
    return (
      <TabsContext.Provider value={{ value, setValue: (next) => setValue(next), activationMode, variant, overflow }}>
        <TabsPrimitive.Root
          ref={ref}
          // Always controlled: Base UI's own fallback would select the first tab where Radix selects none.
          value={value ?? null}
          onValueChange={(next) => setValue(next as string)}
          orientation={orientation}
          {...props}
          {...slot(asChild, children)}
        />
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = "Tabs";

type TriggerElement = ReactElement<{ value: string; className?: string; count?: number; children?: React.ReactNode }>;
const isTrigger = (node: unknown): node is TriggerElement =>
  isValidElement(node) && node.type === TabsTrigger && typeof (node.props as { value?: unknown }).value === "string";

export const TabsList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & { loop?: boolean; asChild?: boolean }
>(({ className, loop = true, asChild, children, style, ...props }, forwardedRef) => {
  const { value, setValue, activationMode, variant, overflow } = useContext(TabsContext);
  const menuMode = overflow === "menu" && variant !== "pill" && !asChild;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const fade = useScrollFade<HTMLDivElement>();
  const ref = useMergedRefs(listRef, fade.ref, forwardedRef);

  const nodes = menuMode ? Children.toArray(children) : [];
  const triggers = nodes.filter(isTrigger);
  const layout = useTabsOverflow({
    enabled: menuMode,
    values: triggers.map((t) => t.props.value),
    active: value,
    wrapRef,
    listRef,
    moreRef,
  });

  // Keep the active tab visible in a row that scrolls sideways (a deep link, a programmatic change, a
  // keyboard move). Scrolls the row itself, never `scrollIntoView`, which would also move the page.
  useEffect(() => {
    const list = listRef.current;
    if (menuMode || !list || list.scrollWidth <= list.clientWidth + 1) return;
    const active = list.querySelector<HTMLElement>('[data-state="active"]');
    if (!active) return;
    // From where the tab's centre is to where the row's centre is: the same in LTR and RTL (whose
    // `scrollLeft` is negative), unlike an absolute `scrollTo` target.
    const tab = active.getBoundingClientRect();
    const row = list.getBoundingClientRect();
    list.scrollBy({ left: tab.left + tab.width / 2 - (row.left + row.width / 2), behavior: "smooth" });
  }, [value, menuMode]);

  if (!menuMode) {
    return (
      <TabsPrimitive.List
        ref={ref}
        loopFocus={loop}
        activateOnFocus={activationMode === "automatic"}
        data-variant={variant}
        className={cn(listClass[variant], className)}
        style={variant === "pill" ? style : { ...fade.style, ...style }}
        {...props}
        {...slot(asChild, children)}
      />
    );
  }

  // Tabs that do not fit stay mounted (so they can be measured and Base UI keeps its registry) but are
  // invisible, out of the way and out of the tab order; the menu offers them instead.
  const inRow = (node: unknown): boolean => !layout.inline || !isTrigger(node) || layout.inline.has(node.props.value);
  const rendered = nodes.map((node) =>
    isTrigger(node) && !inRow(node)
      ? cloneElement(node as ReactElement<Record<string, unknown>>, {
          disabled: true,
          "aria-hidden": true,
          tabIndex: -1,
          className: cn(node.props.className, "invisible absolute left-0 top-0 pointer-events-none"),
        })
      : node,
  );
  const overflowItems = triggers
    .filter((t) => !inRow(t))
    .map((t) => ({
      value: t.props.value,
      content: (
        <>
          {t.props.children}
          {t.props.count == null ? null : <span className="ml-auto text-xs tabular-nums text-muted-foreground">{t.props.count}</span>}
        </>
      ),
    }));

  return (
    <div
      ref={wrapRef}
      data-slot="tabs-overflow-row"
      className={cn("relative flex w-full min-w-0 items-end", variant === "underline" && "border-b border-border")}
    >
      <TabsPrimitive.List
        ref={ref}
        loopFocus={loop}
        activateOnFocus={activationMode === "automatic"}
        data-variant={variant}
        className={cn(
          listClass[variant],
          "relative min-w-0 flex-1 overflow-hidden border-b-0 md:flex-nowrap md:overflow-hidden",
          className,
        )}
        style={style}
        {...props}
      >
        {rendered}
      </TabsPrimitive.List>
      <TabsOverflowMenu
        items={overflowItems}
        onSelect={setValue}
        hidden={!layout.hasOverflow}
        buttonRef={moreRef}
        buttonClassName={cn(
          triggerClass[variant],
          "group/more ml-1",
          !layout.hasOverflow && "invisible absolute right-0 top-0 pointer-events-none",
        )}
      />
    </div>
  );
});
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<"button">, "value"> & {
    value: string;
    /** A small count badge after the label (e.g. the number of items behind the tab). Not with `asChild`. */
    count?: number;
    /** Colours the count badge: an overdue task or a risk wants a look. */
    countTone?: TabsCountTone;
    asChild?: boolean;
  }
>(({ className, value, count, countTone, asChild, children, ...props }, ref) => {
  const ctx = useContext(TabsContext);
  // `asChild` hands the single child element to the primitive as is, so the badge needs the plain button.
  const content =
    count == null || asChild ? (
      children
    ) : (
      <>
        {children}
        <span data-slot="tab-count" className={cn(countClass[ctx.variant], countTone && toneClass[countTone])}>
          {count}
        </span>
      </>
    );
  return (
    <TabsPrimitive.Tab
      ref={ref}
      value={value}
      data-state={tabState(ctx, value)}
      data-tab-value={value}
      className={cn("group/tab", triggerClass[ctx.variant], className)}
      {...props}
      {...slot(asChild, content, { button: true })}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & { value: string; forceMount?: boolean; asChild?: boolean }
>(({ className, value, forceMount, asChild, children, ...props }, ref) => {
  const ctx = useContext(TabsContext);
  // Radix: an inactive panel is gone at once (Base UI keeps it shown until its animations end, so
  // both panels show for a frame); a force-mounted one stays visible and usable, hidden only by the
  // app's `data-state` CSS (Base UI would add `hidden` and `inert`).
  if (ctx.value !== value && !forceMount) return null;
  return (
    <TabsPrimitive.Panel
      ref={ref}
      value={value}
      keepMounted={forceMount}
      hidden={false}
      inert={false}
      data-state={tabState(ctx, value)}
      className={cn("mt-2 flex-1 outline-none", className)}
      {...props}
      {...slot(asChild, children)}
    />
  );
});
TabsContent.displayName = "TabsContent";
