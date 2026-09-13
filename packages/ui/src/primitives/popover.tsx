import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef, useEffect, useState } from "react";
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
>(({ className, align = "start", sideOffset = 4, container, style: styleProp, ...props }, ref) => {
  // Same rAF-driven entrance as DialogContent/SheetContent: Radix mounts
  // already at data-state="open", so the initial frame is rendered
  // faded-out/scaled-down via inline style, then cleared so the transition
  // plays. Exit already animates via Radix's own defer-unmount-until-done.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        style={entered ? styleProp : { opacity: 0, transform: "scale(0.95)", ...styleProp }}
        className={cn(
          "z-50 w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-opacity data-[state=closed]:opacity-0 motion-safe:data-[state=closed]:scale-95",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = "PopoverContent";
