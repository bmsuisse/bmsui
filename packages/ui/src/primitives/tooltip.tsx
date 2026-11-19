import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useId,
} from "react";
import { cn } from "../lib/utils";
import {
  type RadixPositionProps,
  radixVars,
  slot,
  splitPosition,
  useControllable,
} from "../lib/radixCompat";

export function TooltipProvider({
  delayDuration,
  skipDelayDuration: _skip,
  disableHoverableContent: _hoverable,
  children,
}: {
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
  children?: ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider delay={delayDuration}>
      <DelayContext.Provider value={delayDuration}>{children}</DelayContext.Provider>
    </TooltipPrimitive.Provider>
  );
}

const DelayContext = createContext<number | undefined>(undefined);
const OpenContext = createContext<{ open: boolean; delay?: number; id?: string }>({ open: false });

export function Tooltip({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  delayDuration,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  disableHoverableContent?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const inherited = useContext(DelayContext);
  const id = useId();
  return (
    <TooltipPrimitive.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <OpenContext.Provider value={{ open, delay: delayDuration ?? inherited, id }}>{children}</OpenContext.Provider>
    </TooltipPrimitive.Root>
  );
}

export const TooltipTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
  const { open, delay, id } = useContext(OpenContext);
  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      delay={delay}
      // Radix linked the hint for screen readers; Base UI leaves it to the app.
      aria-describedby={open ? id : undefined}
      data-state={open ? "delayed-open" : "closed"}
      {...props}
      {...slot(asChild, children)}
    />
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

export const TooltipContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> & RadixPositionProps & { forceMount?: boolean }
>(({ className, sideOffset = 4, forceMount, ...props }, ref) => {
  const { open, id } = useContext(OpenContext);
  const { position, rest } = splitPosition({ sideOffset, ...props });
  return (
    <TooltipPrimitive.Portal keepMounted={forceMount}>
      <TooltipPrimitive.Positioner {...position} style={radixVars("tooltip")}>
        <TooltipPrimitive.Popup
          ref={ref}
          id={id}
          role="tooltip"
          data-state={open ? "delayed-open" : "closed"}
          className={cn(
            "overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md",
            className,
          )}
          {...rest}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = "TooltipContent";
