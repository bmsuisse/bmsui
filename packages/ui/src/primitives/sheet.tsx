import { type VariantProps, cva } from "class-variance-authority";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { ComponentPropsWithoutRef, CSSProperties, HTMLAttributes, PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { forwardRef, useRef, useState } from "react";
import { useKeyboardGeometry } from "../hooks/useKeyboardOffset";
import { useMergedRefs } from "../hooks/useMergedRefs";
import { cn } from "../lib/utils";
import { fadeMotion, sheetMotion, usePresenceMotion } from "../lib/sheetMotion";
import { I18nText } from "../i18n/locale";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPopup,
  type DialogPopupProps,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  useDialog,
} from "./dialog-base";

export const Sheet = Dialog;
export const SheetTrigger = DialogTrigger;
export const SheetClose = DialogClose;
export const SheetPortal = DialogPortal;

/** The sheet's backdrop; fades in and out with the sheet (see `usePresenceMotion`). */
export const SheetOverlay = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof DialogOverlay>>(
  ({ className, ...props }, forwardedRef) => {
    const { open } = useDialog();
    const ref = useRef<HTMLDivElement | null>(null);
    usePresenceMotion(ref, open, fadeMotion);
    return <DialogOverlay ref={useMergedRefs(ref, forwardedRef)} className={className} {...props} />;
  },
);
SheetOverlay.displayName = "SheetOverlay";

// Motion is not CSS here: this package ships no keyframes and does not assume `tailwindcss-animate`.
// `usePresenceMotion` plays the slide with the Web Animations API instead (see lib/sheetMotion.ts for
// why that cannot leave a sheet stuck off-screen or an invisible overlay behind).
// `flex flex-col overflow-hidden`: SheetHeader/SheetBody/SheetFooter are the layout; only SheetBody
// scrolls, so a consumer's `overflow-y-auto` on this element would scroll title and footer away too.
export const sheetVariants = cva(
  "fixed z-50 flex flex-col gap-4 overflow-hidden bg-background p-6 shadow-lg transition-shadow duration-300",
  {
    variants: {
      side: {
        // Every edge border below is paired with `border-border` explicitly —
        // Tailwind v4's bare `border-*` utilities default to `currentColor`,
        // not the theme's border token, which otherwise renders this seam in
        // the foreground text color (a harsh, high-contrast line in both
        // themes) instead of the intended subtle divider.
        top: "inset-x-0 top-0 border-b border-border",
        bottom:
          "inset-x-0 bottom-0 border-t border-border",
        left: "inset-y-0 left-0 h-full w-3/4 border-r border-border sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l border-border sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

export interface SheetContentProps extends DialogPopupProps, VariantProps<typeof sheetVariants> {
  /**
   * Bottom sheets only: adds a drag handle so the user can pull the sheet
   * taller (up to 95% of the viewport) or shorter (down to 30%) with the
   * mouse/touch instead of being stuck with the height set by className.
   * Ignored for other sides.
   */
  resizable?: boolean;
  /** The built-in close button (default `true`). */
  showCloseButton?: boolean;
  /** data-testid for the built-in close button. */
  closeButtonTestId?: string;
  /**
   * Bottom sheets with a text input: lift the sheet onto the on-screen keyboard and clamp it to the
   * visual viewport. Mobile browsers do not shrink the layout viewport for the keyboard, so without this
   * the bottom of the sheet (and its footer) ends up behind it. Default `false`.
   */
  keyboardAware?: boolean;
}

// Rendered inside the portal on purpose: Base UI creates the portal node over a couple of commits, so the
// popup only exists (and `ref.current` is only set) once this component mounts. Hooks that need the element,
// like the slide animation, therefore live here and not in SheetContent.
const SheetPopup = forwardRef<HTMLDivElement, Omit<SheetContentProps, "forceMount">>(
  (
    {
      side = "right",
      className,
      children,
      resizable = false,
      showCloseButton = true,
      closeButtonTestId,
      keyboardAware = false,
      style: styleProp,
      ...props
    },
    forwardedRef,
  ) => {
    const { open } = useDialog();
    const popupRef = useRef<HTMLDivElement | null>(null);
    usePresenceMotion(popupRef, open, sheetMotion(side ?? "right"));
    const keyboard = useKeyboardGeometry(keyboardAware && side === "bottom");

    // Drag-to-resize: track the sheet's height in local state once the user
    // starts dragging the handle, clamped between 30% and 95% of the
    // viewport height.
    const [dragHeight, setDragHeight] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef<{ y: number; height: number } | null>(null);
    const canResize = resizable && side === "bottom";

    const onHandlePointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
      const popup = e.currentTarget.closest('[data-slot="sheet-content"]');
      if (!(popup instanceof HTMLElement)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStart.current = { y: e.clientY, height: popup.getBoundingClientRect().height };
      setIsDragging(true);
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
      setIsDragging(false);
    };

    // `maxHeight` beats `height` regardless of source order, so a drag height and a className height are
    // both clipped while the keyboard is up and restored when it closes.
    const style: CSSProperties = {
      ...styleProp,
      ...(canResize && dragHeight != null
        ? // Never taller than the screen, even if the screen shrank after the drag (rotation).
          { height: `min(${dragHeight}px, 95dvh)`, maxHeight: `min(${dragHeight}px, 95dvh)` }
        : null),
      ...(keyboard.offset || keyboard.visibleHeight
        ? { bottom: `${keyboard.offset}px`, maxHeight: `${keyboard.visibleHeight}px` }
        : null),
    };

    return (
      <DialogPopup
        ref={useMergedRefs(popupRef, forwardedRef)}
        data-slot="sheet-content"
        data-side={side}
        style={style}
        className={cn(sheetVariants({ side }), isDragging && "shadow-2xl", className)}
        {...props}
      >
        {canResize && (
          <div
            data-testid="sheet-drag-handle"
            className="group -mb-2 flex shrink-0 cursor-grab touch-none justify-center py-2 active:cursor-grabbing"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <div
              className={cn(
                "h-1 w-10 rounded-[var(--radius-pill,9999px)] bg-muted-foreground/30 transition-all duration-150 group-hover:w-14 group-hover:bg-muted-foreground/50",
                isDragging && "w-14 bg-primary/60 dark:bg-ring/60",
              )}
            />
          </div>
        )}
        {children}
        {showCloseButton ? (
          <SheetClose
            data-slot="sheet-close"
            data-testid={closeButtonTestId}
            className="absolute right-4 top-4 z-20 -m-2 rounded-md p-2 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:-m-2.5 max-md:p-2.5"
          >
            <XMarkIcon className="h-4 w-4 max-md:h-6 max-md:w-6" />
            <span className="sr-only"><I18nText k="common.close" /></span>
          </SheetClose>
        ) : null}
      </DialogPopup>
    );
  },
);
SheetPopup.displayName = "SheetPopup";

export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(({ forceMount, ...props }, ref) => (
  <SheetPortal forceMount={forceMount}>
    <SheetOverlay />
    <SheetPopup ref={ref} {...props} />
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

// `shrink-0`: without it, flexbox's default `flex-shrink: 1` would let this
// shrink (squishing/clipping the title) instead of SheetBody giving up its
// own space first, once combined content doesn't fit SheetContent's height.
export const SheetHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("flex shrink-0 flex-col gap-1.5", className)} {...props} />
);

// The one scrolling region -- see sheetVariants' own comment above for why.
// `min-h-0` overrides flexbox's default `min-height: auto`, which otherwise
// refuses to shrink a flex item below its content's natural height and
// silently defeats `overflow-y-auto` (same DialogBody needs this for).
export const SheetBody = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("min-h-0 flex-1 overflow-y-auto", className)} {...props} />
);

export const SheetFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("flex shrink-0 flex-wrap justify-end gap-2", className)} {...props} />
);

export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
