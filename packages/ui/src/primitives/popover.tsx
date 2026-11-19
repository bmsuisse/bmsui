import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useRender } from "@base-ui/react/use-render";
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import {
  DismissProvider,
  useAutoFocus,
  openState,
  type RadixDismissProps,
  type RadixFocusProps,
  type RadixPositionProps,
  radixVars,
  slot,
  splitPosition,
  useControllable,
  useDismissBridge,
  useDismissCallbacks,
} from "../lib/radixCompat";
import { cn } from "../lib/utils";

/** What Radix calls a `Measurable`: an element, or a virtual box like a table row's rectangle. */
type Measurable = { getBoundingClientRect(): DOMRect };
type Anchor = Measurable | RefObject<Measurable | null>;
const PopoverContext = createContext<{
  open: boolean;
  anchor: Anchor | null;
  setAnchor: (anchor: Anchor | null) => void;
} | null>(null);
const usePopover = () => {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error("Popover parts must be inside <Popover>");
  return ctx;
};

export function Popover({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  modal = false,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const dismiss = useDismissBridge((next: boolean) => setOpen(next));
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={dismiss.onOpenChange} modal={modal}>
      <DismissProvider value={dismiss.ref}>
        <PopoverContext.Provider value={{ open, anchor, setAnchor }}>{children}</PopoverContext.Provider>
      </DismissProvider>
    </PopoverPrimitive.Root>
  );
}

export const PopoverTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { asChild?: boolean }
>(({ asChild, children, ...props }, ref) => {
  const { open } = usePopover();
  return (
    <PopoverPrimitive.Trigger
      ref={ref}
      data-state={openState(open)}
      {...props}
      {...slot(asChild, children, { button: true })}
    />
  );
});
PopoverTrigger.displayName = "PopoverTrigger";

/** Positions the popover against this element (or `virtualRef`'s box) instead of the trigger. */
export function PopoverAnchor({
  asChild,
  children,
  ref,
  virtualRef,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  asChild?: boolean;
  ref?: React.Ref<HTMLDivElement>;
  virtualRef?: RefObject<Measurable | null>;
}) {
  const { setAnchor } = usePopover();
  // The ref is read when Base UI positions the popup, so a row attached later in the same commit still counts.
  useLayoutEffect(() => {
    if (!virtualRef) return;
    setAnchor(virtualRef);
    return () => setAnchor(null);
  }, [virtualRef, setAnchor]);
  const anchorRef = useCallback(
    (element: HTMLDivElement | null) => {
      setAnchor(element);
      return () => setAnchor(null);
    },
    [setAnchor],
  );
  return useRender({
    enabled: !virtualRef,
    defaultTagName: "div",
    render: asChild ? (children as React.ReactElement) : undefined,
    ref: ref ? [ref, anchorRef] : anchorRef,
    props: asChild ? props : { ...props, children },
  });
}

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div"> &
    RadixPositionProps &
    RadixDismissProps &
    RadixFocusProps & {
      /** Portal target. Defaults to `document.body`. Pass the Dialog/Sheet content element when
       * the popover opens from inside a modal, so it stays inside that modal's focus trap. */
      container?: HTMLElement | null;
      forceMount?: boolean;
    }
>(
  (
    {
      className,
      align = "start",
      sideOffset = 4,
      collisionPadding = 8,
      container,
      forceMount,
      onOpenAutoFocus,
      onCloseAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      ...props
    },
    ref,
  ) => {
    const { open, anchor } = usePopover();
    useDismissCallbacks({ onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside });
    const autoFocus = useAutoFocus({ onOpenAutoFocus, onCloseAutoFocus }, ref);
    const { position, rest } = splitPosition({ align, sideOffset, collisionPadding, ...props });
    return (
      <PopoverPrimitive.Portal container={container} keepMounted={forceMount}>
        <PopoverPrimitive.Positioner
          {...position}
          anchor={anchor && "current" in anchor ? () => anchor.current : (anchor ?? undefined)}
          style={radixVars("popover")}
        >
          <PopoverPrimitive.Popup
            data-state={openState(open)}
            {...autoFocus}
            className={cn(
              "w-72 max-w-[calc(100vw-1rem)] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
              className,
            )}
            {...rest}
          />
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    );
  },
);
PopoverContent.displayName = "PopoverContent";
