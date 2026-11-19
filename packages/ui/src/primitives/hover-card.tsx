import { PreviewCard as HoverCardPrimitive } from "@base-ui/react/preview-card";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { createContext, forwardRef, useContext, useEffect, useState } from "react";
import { openState, type RadixPositionProps, radixVars, slot, splitPosition } from "../lib/radixCompat";
import { cn } from "../lib/utils";

/** Exit fade duration; the enter is 150ms. */
const EXIT_MS = 120;

const HoverCardContext = createContext<{ open: boolean; exiting: boolean; openDelay: number; closeDelay: number }>({
  open: false,
  exiting: false,
  openDelay: 300,
  closeDelay: 150,
});

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/**
 * HoverCard: a rich preview (contact card, linked record) shown while a
 * pointer rests on the trigger. Sighted-mouse only by design — keyboard focus
 * opens it too, but touch does not, so never put the only way to reach
 * information or actions in it. For a short text hint use `Tooltip`; for
 * something the user clicks to open use `Popover`.
 *
 * Defaults: 300ms open delay (a pass-over doesn't flash it) and 150ms close
 * delay (moving into the card doesn't dismiss it).
 *
 * Motion: the card fades and scales up (96% → 100%) from the side it opens on,
 * nudged 4px toward the trigger, 150ms ease-out; on close it fades/shrinks out in
 * 120ms ease-in before unmounting. The root keeps the card mounted for those 120ms
 * itself, so the exit does not depend on Base UI detecting the transition. Reduced
 * motion: opacity only. `animated={false}` opens and closes instantly.
 */
export const HoverCard = ({
  openDelay = 300,
  closeDelay = 150,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  animated = true,
  children,
}: {
  openDelay?: number;
  closeDelay?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Fade/scale in and out. @default true */
  animated?: boolean;
  children?: ReactNode;
}) => {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  // Closing: keep the card open for EXIT_MS while the content plays its exit.
  // Derived during render (not in an effect) so the content never unmounts for a frame.
  const [prevOpen, setPrevOpen] = useState(open);
  const [exiting, setExiting] = useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setExiting(!open && animated && !prefersReducedMotion());
  }
  useEffect(() => {
    if (!exiting) return;
    const handle = setTimeout(() => setExiting(false), EXIT_MS);
    return () => clearTimeout(handle);
  }, [exiting]);
  const handleOpenChange = (next: boolean): void => {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };
  return (
    <HoverCardPrimitive.Root open={open || exiting} onOpenChange={handleOpenChange}>
      <HoverCardContext.Provider value={{ open, exiting, openDelay, closeDelay }}>{children}</HoverCardContext.Provider>
    </HoverCardPrimitive.Root>
  );
};

export const HoverCardTrigger = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<"a"> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
  const { open, openDelay, closeDelay } = useContext(HoverCardContext);
  return (
    <HoverCardPrimitive.Trigger
      ref={ref}
      delay={openDelay}
      closeDelay={closeDelay}
      data-state={openState(open)}
      {...props}
      {...slot(asChild, children)}
    />
  );
});
HoverCardTrigger.displayName = "HoverCardTrigger";

export const HoverCardContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> &
    RadixPositionProps & {
      /** Portal target; see `PopoverContent`'s `container` for when you need it (inside a Dialog/Sheet). */
      container?: HTMLElement | null;
      forceMount?: boolean;
    }
>(({ className, align = "start", sideOffset = 6, collisionPadding = 8, container, forceMount, ...props }, ref) => {
  const { open, exiting } = useContext(HoverCardContext);
  const { position, rest } = splitPosition({ align, sideOffset, collisionPadding, ...props });
  return (
    <HoverCardPrimitive.Portal container={container} keepMounted={forceMount}>
      <HoverCardPrimitive.Positioner {...position} style={radixVars("hover-card")}>
      <HoverCardPrimitive.Popup
        ref={ref}
        data-state={openState(open)}
        data-testid="hover-card"
        data-exiting={exiting || undefined}
        className={cn(
          // 10% foreground hairline in light: --border is near-invisible on the light surface.
          "z-50 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-foreground/10 bg-popover p-4 text-sm text-popover-foreground shadow-lg shadow-black/[0.08] outline-none dark:border-border dark:shadow-black/40",
          // Enter via @starting-style, exit via data-exiting; scale grows from the computed transform origin.
          "origin-(--radix-hover-card-content-transform-origin) transition-[opacity,scale,translate] duration-150 ease-out starting:opacity-0 motion-reduce:transition-opacity",
          "motion-safe:starting:scale-[0.96] motion-safe:data-[side=bottom]:starting:-translate-y-1 motion-safe:data-[side=top]:starting:translate-y-1 motion-safe:data-[side=left]:starting:translate-x-1 motion-safe:data-[side=right]:starting:-translate-x-1",
          "data-[exiting]:pointer-events-none data-[exiting]:opacity-0 data-[exiting]:duration-[120ms] data-[exiting]:ease-in motion-safe:data-[exiting]:scale-[0.96]",
          className,
        )}
        {...rest}
      />
      </HoverCardPrimitive.Positioner>
    </HoverCardPrimitive.Portal>
  );
});
HoverCardContent.displayName = "HoverCardContent";
