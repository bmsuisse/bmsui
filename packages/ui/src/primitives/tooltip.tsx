import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef, useEffect, useState } from "react";
import { cn } from "../lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, style: styleProp, ...props }, ref) => {
  // Same rAF-driven entrance as PopoverContent/DialogContent — a tooltip is
  // the fastest-appearing of the three (kept quick so it still reads as a
  // hover hint, not a deliberate reveal).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        style={entered ? styleProp : { opacity: 0, transform: "scale(0.95)", ...styleProp }}
        className={cn(
          "z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md transition-[opacity,transform] duration-100 ease-out motion-reduce:transition-opacity data-[state=closed]:opacity-0 motion-safe:data-[state=closed]:scale-95",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = "TooltipContent";
