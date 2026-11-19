import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ScrollBarProps extends ComponentPropsWithoutRef<"div"> {
  orientation?: "vertical" | "horizontal";
}

/** Shown while the pointer is over the area or it scrolls, like Radix's default `type="hover"`. */
export const ScrollBar = forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = "vertical", ...props }, ref) => (
    <ScrollAreaPrimitive.Scrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        "flex touch-none select-none opacity-0 transition-[color,background-color,border-color,opacity] data-[hovering]:opacity-100 data-[scrolling]:opacity-100",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-[var(--radius-pill,9999px)] bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
  ),
);
ScrollBar.displayName = "ScrollBar";

export const ScrollArea = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, children, ...props }, ref) => (
    <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  ),
);
ScrollArea.displayName = "ScrollArea";
