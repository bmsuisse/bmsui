import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface SeparatorProps extends ComponentPropsWithoutRef<"div"> {
  orientation?: "horizontal" | "vertical";
  /** Purely visual: hidden from assistive technology (`role="none"`). @default true */
  decorative?: boolean;
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <SeparatorPrimitive
      ref={ref}
      orientation={orientation}
      {...(decorative ? { role: "none", "aria-orientation": undefined } : {})}
      className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
      {...props}
    />
  ),
);
Separator.displayName = "Separator";
