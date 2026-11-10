import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

/**
 * Radix HoverCard: a rich preview (contact card, linked record) shown while a
 * pointer rests on the trigger. Sighted-mouse only by design — keyboard focus
 * opens it too, but touch does not, so never put the only way to reach
 * information or actions in it. For a short text hint use `Tooltip`; for
 * something the user clicks to open use `Popover`.
 *
 * Defaults: 300ms open delay (a pass-over doesn't flash it) and 150ms close
 * delay (moving into the card doesn't dismiss it).
 */
export const HoverCard = ({
  openDelay = 300,
  closeDelay = 150,
  ...props
}: ComponentPropsWithoutRef<typeof HoverCardPrimitive.Root>) => (
  <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={closeDelay} {...props} />
);
export const HoverCardTrigger = HoverCardPrimitive.Trigger;

export const HoverCardContent = forwardRef<
  ElementRef<typeof HoverCardPrimitive.Content>,
  ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> & {
    /** Portal target; see `PopoverContent`'s `container` for when you need it (inside a Dialog/Sheet). */
    container?: ComponentPropsWithoutRef<typeof HoverCardPrimitive.Portal>["container"];
  }
>(({ className, align = "start", sideOffset = 6, container, ...props }, ref) => (
  <HoverCardPrimitive.Portal container={container}>
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      data-testid="hover-card"
      className={cn(
        "z-50 w-72 rounded-md border border-border bg-popover p-4 text-sm text-popover-foreground shadow-md outline-none",
        "transition-opacity duration-150 starting:opacity-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  </HoverCardPrimitive.Portal>
));
HoverCardContent.displayName = "HoverCardContent";
