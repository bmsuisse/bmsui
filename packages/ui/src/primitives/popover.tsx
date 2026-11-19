import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useRender } from "@base-ui/react/use-render";
import {
  type ComponentPropsWithoutRef,
  createContext,
  forwardRef,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from "react";
import {
  DismissProvider,
  focusProps,
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
const PopoverContext = createContext<{
  open: boolean;
  anchor: RefObject<Measurable | null>;
  hasAnchor: RefObject<boolean>;
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
  const anchor = useRef<Measurable | null>(null);
  const hasAnchor = useRef(false);
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={dismiss.onOpenChange} modal={modal}>
      <DismissProvider value={dismiss.ref}>
        <PopoverContext.Provider value={{ open, anchor, hasAnchor }}>{children}</PopoverContext.Provider>
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
  const { anchor, hasAnchor } = usePopover();
  hasAnchor.current = true;
  if (virtualRef) anchor.current = virtualRef.current;
  return useRender({
    enabled: !virtualRef,
    defaultTagName: "div",
    render: asChild ? (children as React.ReactElement) : undefined,
    ref: ref ? [ref, anchor as RefObject<HTMLDivElement | null>] : (anchor as RefObject<HTMLDivElement | null>),
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
    const { open, anchor, hasAnchor } = usePopover();
    useDismissCallbacks({ onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside });
    const { position, rest } = splitPosition({ align, sideOffset, collisionPadding, ...props });
    return (
      <PopoverPrimitive.Portal container={container} keepMounted={forceMount}>
        <PopoverPrimitive.Positioner
          {...position}
          anchor={hasAnchor.current ? () => anchor.current : undefined}
          className="z-50"
          style={radixVars("popover")}
        >
          <PopoverPrimitive.Popup
            ref={ref}
            data-state={openState(open)}
            {...focusProps({ onOpenAutoFocus, onCloseAutoFocus })}
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
