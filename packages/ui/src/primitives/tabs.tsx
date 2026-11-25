import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { type ComponentPropsWithoutRef, createContext, forwardRef, useContext } from "react";
import { slot, useControllable } from "../lib/radixCompat";
import { cn } from "../lib/utils";

export type TabsVariant = "pill" | "underline";

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
   */
  variant?: TabsVariant;
  asChild?: boolean;
}

const listClass: Record<TabsVariant, string> = {
  pill: "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
  // Scrolls sideways when the tabs do not fit; the scrollbar stays out of the way.
  underline:
    "flex w-full min-w-0 items-end justify-start gap-1 overflow-x-auto border-b border-border text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
};

const triggerClass: Record<TabsVariant, string> = {
  pill: "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium text-foreground/60 transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  // `-mb-px` lets the active underline sit on the list's hairline instead of above it.
  underline:
    "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=active]:border-primary data-[state=active]:text-foreground max-md:min-h-11",
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
>(({ className, loop = true, asChild, children, ...props }, ref) => {
  const { activationMode, variant } = useContext(TabsContext);
  return (
    <TabsPrimitive.List
      ref={ref}
      loopFocus={loop}
      activateOnFocus={activationMode === "automatic"}
      data-variant={variant}
      className={cn(listClass[variant], className)}
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
    asChild?: boolean;
  }
>(({ className, value, count, asChild, children, ...props }, ref) => {
  const ctx = useContext(TabsContext);
  // `asChild` hands the single child element to the primitive as is, so the badge needs the plain button.
  const content =
    count == null || asChild ? (
      children
    ) : (
      <>
        {children}
        <span data-slot="tab-count" className="rounded-full bg-muted px-1.5 text-[11px] font-normal tabular-nums text-muted-foreground">
          {count}
        </span>
      </>
    );
  return (
    <TabsPrimitive.Tab
      ref={ref}
      value={value}
      data-state={tabState(ctx, value)}
      className={cn(triggerClass[ctx.variant], className)}
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
