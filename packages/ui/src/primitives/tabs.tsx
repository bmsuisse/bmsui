import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { type ComponentPropsWithoutRef, createContext, forwardRef, useContext, useEffect, useRef } from "react";
import { useMergedRefs } from "../hooks/useMergedRefs";
import { slot, useControllable } from "../lib/radixCompat";
import { useScrollFade } from "../lib/scrollFade";
import { cn } from "../lib/utils";

export type TabsVariant = "pill" | "underline" | "chips";
export type TabsCountTone = "danger" | "warning";

interface TabsContextValue {
  value: string | undefined;
  activationMode: "automatic" | "manual";
  variant: TabsVariant;
}
const TabsContext = createContext<TabsContextValue>({ value: undefined, activationMode: "automatic", variant: "pill" });
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
      asChild,
      children,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllable<string | undefined>(valueProp, defaultValue, onValueChange as (v?: string) => void);
    return (
      <TabsContext.Provider value={{ value, activationMode, variant }}>
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

export const TabsList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & { loop?: boolean; asChild?: boolean }
>(({ className, loop = true, asChild, children, style, ...props }, forwardedRef) => {
  const { value, activationMode, variant } = useContext(TabsContext);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fade = useScrollFade<HTMLDivElement>();
  const ref = useMergedRefs(listRef, fade.ref, forwardedRef);

  // Keep the active tab visible in a row that scrolls sideways (a deep link, a programmatic change, a
  // keyboard move). Scrolls the row itself, never `scrollIntoView`, which would also move the page.
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth + 1) return;
    const active = list.querySelector<HTMLElement>('[data-state="active"]');
    if (!active) return;
    const left = active.offsetLeft - list.offsetLeft;
    const target = left - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [value]);

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
