import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    /** Portal target for the popover content. Defaults to `document.body` (Radix's
     * own default) when omitted. Needed when the popover is opened from inside a
     * modal Dialog/Sheet: Radix's Dialog `FocusScope` traps focus within its own
     * content subtree, and a popover portaled to `document.body` sits outside that
     * subtree — so pass the Dialog/Sheet content element here to portal into it
     * instead. */
    container?: ComponentPropsWithoutRef<typeof PopoverPrimitive.Portal>["container"];
  }
>(({ className, align = "start", sideOffset = 4, container, ...props }, ref) => (
  <PopoverPrimitive.Portal container={container}>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";
