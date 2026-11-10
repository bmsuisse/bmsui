import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

/**
 * Radix Collapsible: one trigger shows/hides one region. Use it for a bare
 * "show more" toggle; for a titled section with chevron and count use
 * `CollapsibleSection`.
 */
export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

/** The region Radix shows/hides. Unstyled apart from `overflow-hidden`; no animation plugin assumed. */
export const CollapsibleContent = forwardRef<
  ElementRef<typeof CollapsiblePrimitive.Content>,
  ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.Content ref={ref} className={cn("overflow-hidden", className)} {...props} />
));
CollapsibleContent.displayName = "CollapsibleContent";
