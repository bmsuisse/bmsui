import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { type ComponentPropsWithoutRef, createContext, forwardRef, useContext } from "react";
import { slot, useControllable } from "../lib/radixCompat";
import { cn } from "../lib/utils";

interface TabsContextValue {
  value: string | undefined;
  activationMode: "automatic" | "manual";
}
const TabsContext = createContext<TabsContextValue>({ value: undefined, activationMode: "automatic" });
const tabState = (ctx: TabsContextValue, value: string) => (ctx.value === value ? "active" : "inactive");

export interface TabsProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  /** `automatic` (default): arrow keys activate the focused tab. `manual`: Enter/Space does. */
  activationMode?: "automatic" | "manual";
  asChild?: boolean;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      orientation = "horizontal",
      activationMode = "automatic",
      asChild,
      children,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllable<string | undefined>(valueProp, defaultValue, onValueChange as (v?: string) => void);
    return (
      <TabsContext.Provider value={{ value, activationMode }}>
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
  const { activationMode } = useContext(TabsContext);
  return (
    <TabsPrimitive.List
      ref={ref}
      loopFocus={loop}
      activateOnFocus={activationMode === "automatic"}
      className={cn(
        "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
        className,
      )}
      {...props}
      {...slot(asChild, children)}
    />
  );
});
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<"button">, "value"> & { value: string; asChild?: boolean }
>(({ className, value, asChild, children, ...props }, ref) => {
  const ctx = useContext(TabsContext);
  return (
    <TabsPrimitive.Tab
      ref={ref}
      value={value}
      data-state={tabState(ctx, value)}
      className={cn(
        // Base UI keeps a disabled tab focusable (aria-disabled), so `disabled:` alone no longer matches.
        "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium text-foreground/60 transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
      {...slot(asChild, children, { button: true })}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & { value: string; forceMount?: boolean; asChild?: boolean }
>(({ className, value, forceMount, asChild, children, ...props }, ref) => {
  const ctx = useContext(TabsContext);
  return (
    <TabsPrimitive.Panel
      ref={ref}
      value={value}
      keepMounted={forceMount}
      data-state={tabState(ctx, value)}
      className={cn("mt-2 flex-1 outline-none", className)}
      {...props}
      {...slot(asChild, children)}
    />
  );
});
TabsContent.displayName = "TabsContent";
