import { type VariantProps, cva } from "class-variance-authority";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementRef,
  HTMLAttributes,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export const SheetOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50", className)}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

// Neither this package nor any other package in the monorepo depends on the
// `tailwindcss-animate` plugin (grepped for "animate-in"/"tailwindcss-animate"
// across the repo — the only pre-existing `data-[state=...]` usages are plain
// color/background toggles, not that plugin's enter/exit keyframe utilities).
// Rather than have @bmsuisse/ui silently assume a consumer has that plugin
// installed, the slide transition here is done with Tailwind's built-in
// `transition-transform` plus a `translate-x`/`translate-y` toggle driven off
// Radix's own `data-[state=open]`/`data-[state=closed]` attributes.
export const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

export interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /**
   * Bottom sheets only: adds a drag handle so the user can pull the sheet
   * taller (up to 95% of the viewport) or shorter (down to 30%) with the
   * mouse/touch instead of being stuck with the height set by className.
   * Ignored for other sides.
   */
  resizable?: boolean;
}

// Off-screen starting transform for the entrance animation below — same
// direction as each side's own `data-[state=closed]` translate class.
const enterFromTransform: Record<"top" | "bottom" | "left" | "right", string> = {
  top: "translateY(-100%)",
  bottom: "translateY(100%)",
  left: "translateX(-100%)",
  right: "translateX(100%)",
};

export const SheetContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, resizable = false, style: styleProp, ...props }, ref) => {
    // Radix mounts Content with `data-state="open"` already on first paint,
    // so the `data-[state=...]` translate classes above never see a "before"
    // position to transition from — it just appears instead of sliding in.
    // Render one frame off-screen via an inline transform (which overrides
    // the class-based one), then clear it so the transition plays. Exit
    // already animates correctly: Radix flips to `data-state="closed"` while
    // still mounted and defers unmounting until the transition ends.
    const [entered, setEntered] = useState(false);
    useEffect(() => {
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }, []);

    // Drag-to-resize: track the sheet's height in local state once the user
    // starts dragging the handle, clamped between 30% and 95% of the
    // viewport height (same bounds as the sheet consumers ported this from).
    const [dragHeight, setDragHeight] = useState<number | null>(null);
    const dragStart = useRef<{ y: number; height: number } | null>(null);
    const canResize = resizable && side === "bottom";

    const onHandlePointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
      const popup = e.currentTarget.closest('[data-slot="sheet-content"]');
      if (!(popup instanceof HTMLElement)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStart.current = { y: e.clientY, height: popup.getBoundingClientRect().height };
    };
    const onHandlePointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
      if (!dragStart.current) return;
      const delta = dragStart.current.y - e.clientY;
      const next = dragStart.current.height + delta;
      const min = window.innerHeight * 0.3;
      const max = window.innerHeight * 0.95;
      setDragHeight(Math.min(max, Math.max(min, next)));
    };
    const onHandlePointerUp = (): void => {
      dragStart.current = null;
    };

    const style: CSSProperties | undefined = entered
      ? { ...styleProp, ...(canResize && dragHeight != null ? { height: dragHeight, maxHeight: dragHeight } : null) }
      : { ...styleProp, transform: enterFromTransform[side ?? "right"] };

    return (
      <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
          ref={ref}
          data-slot="sheet-content"
          style={style}
          className={cn(sheetVariants({ side }), className)}
          {...props}
        >
          {canResize && (
            <div
              data-testid="sheet-drag-handle"
              className="-mb-2 flex shrink-0 cursor-grab touch-none justify-center py-2 active:cursor-grabbing"
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            >
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
          )}
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = "SheetContent";

export const SheetHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("flex flex-col gap-1.5", className)} {...props} />
);

export const SheetFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("flex justify-end gap-2", className)} {...props} />
);

export const SheetTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";
