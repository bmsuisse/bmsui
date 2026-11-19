import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { forwardRef, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { openTrigger } from "./trigger";

export const Popover = PopoverPrimitive.Root;

export const PopoverTrigger = forwardRef<HTMLButtonElement, { asChild?: boolean; children?: ReactNode }>(
  ({ asChild, children }, ref) => <PopoverPrimitive.Trigger ref={ref} {...openTrigger(asChild, children)} />,
);
PopoverTrigger.displayName = "PopoverTrigger";

export function PopoverContent({
  className,
  focusOnOpen,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  /** The element to focus on open; `undefined` keeps the default (the first tabbable child). */
  focusOnOpen?: (popup: HTMLElement) => HTMLElement | undefined;
}) {
  const popup = useRef<HTMLDivElement>(null);
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner align="start" sideOffset={4} collisionPadding={8} className="z-50">
        <PopoverPrimitive.Popup
          ref={popup}
          initialFocus={focusOnOpen && (() => (popup.current && focusOnOpen(popup.current)) ?? true)}
          className={cn(
            "w-72 max-w-[calc(100vw-1rem)] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
