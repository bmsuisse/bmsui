import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { type ComponentPropsWithoutRef, type CSSProperties, createContext, forwardRef, useContext } from "react";
import { openState, slot, useControllable } from "../lib/radixCompat";
import { cn } from "../lib/utils";

const CollapsibleContext = createContext<{ open: boolean; disabled?: boolean }>({ open: false });
const stateAttrs = ({ open, disabled }: { open: boolean; disabled?: boolean }) => ({
  "data-state": openState(open),
  "data-disabled": disabled ? "" : undefined,
});

export interface CollapsibleProps extends ComponentPropsWithoutRef<"div"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  asChild?: boolean;
}

/**
 * One trigger shows/hides one region. Use it for a bare "show more" toggle;
 * for a titled section with chevron and count use `CollapsibleSection`.
 */
export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open: openProp, defaultOpen = false, onOpenChange, disabled, asChild, children, ...props }, ref) => {
    const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
    return (
      <CollapsibleContext.Provider value={{ open, disabled }}>
        <CollapsiblePrimitive.Root
          ref={ref}
          open={open}
          onOpenChange={(next) => setOpen(next)}
          disabled={disabled}
          {...stateAttrs({ open, disabled })}
          {...props}
          {...slot(asChild, children)}
        />
      </CollapsibleContext.Provider>
    );
  },
);
Collapsible.displayName = "Collapsible";

export const CollapsibleTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => (
  <CollapsiblePrimitive.Trigger
    ref={ref}
    {...stateAttrs(useContext(CollapsibleContext))}
    {...props}
    {...slot(asChild, children, { button: true })}
  />
));
CollapsibleTrigger.displayName = "CollapsibleTrigger";

/** The region shown/hidden. Unstyled apart from `overflow-hidden`; no animation plugin assumed. */
export const CollapsibleContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & { forceMount?: boolean; asChild?: boolean }
>(({ className, style, forceMount, asChild, children, ...props }, ref) => (
  <CollapsiblePrimitive.Panel
    ref={ref}
    keepMounted={forceMount}
    // Radix never hid a force-mounted region (callers animate and `inert` it); Base UI would.
    {...(forceMount && { hidden: false })}
    {...stateAttrs(useContext(CollapsibleContext))}
    className={cn("overflow-hidden", className)}
    style={{ ...panelVars("collapsible"), ...style }}
    {...props}
    {...slot(asChild, children)}
  />
));
CollapsibleContent.displayName = "CollapsibleContent";

/** Radix's content size variables, pointing at Base UI's, for height animations written against Radix. */
export const panelVars = (name: "collapsible" | "accordion") =>
  ({
    [`--radix-${name}-content-height`]: `var(--${name}-panel-height)`,
    [`--radix-${name}-content-width`]: `var(--${name}-panel-width)`,
  }) as CSSProperties;
