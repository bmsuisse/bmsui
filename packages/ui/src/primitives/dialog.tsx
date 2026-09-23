import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementRef, HTMLAttributes, ReactElement } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50", className)}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
    /** data-testid for the built-in header close button, since it renders no DOM a caller controls directly. */
    closeButtonTestId?: string;
  }
>(({ className, children, showCloseButton = true, closeButtonTestId, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg",
        className,
      )}
      {...props}
    >
      {showCloseButton ? (
        // Was `absolute`, positioned relative to this scrolling DialogContent
        // itself -- which meant it scrolled away with the body content on any
        // dialog tall enough to need scrolling (the exact case DialogHeader/
        // DialogFooter's own sticky treatment above targets). `sticky top-4`
        // on a zero-height (`h-0`, `overflow-visible` lets the button escape
        // its own collapsed box) full-width flex row keeps it pinned the same
        // way, without adding any real height to the layout -- rendered
        // *before* `children` since a `sticky` element needs to be in source
        // order at the position it should stick from, unlike `absolute`.
        <div className="sticky top-4 z-20 flex h-0 items-start justify-end overflow-visible">
          <DialogPrimitive.Close
            data-testid={closeButtonTestId}
            className="mr-2 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
      ) : null}
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

// `sticky -top-6`/`-mx-6 -mt-6` + `pt-6 px-6` bleeds this out to DialogContent's
// own edge (canceling its `p-6`) and re-applies the same padding as its own,
// so it sticks flush against the *actual* scroll boundary instead of stopping
// 24px short of it (a well-known CSS quirk: a scroll container's own padding
// isn't where a `position: sticky` child's offset is measured from once
// scrolled). Net effect in the common case (content that fits without
// scrolling) is visually identical to the plain, non-sticky div this replaced
// -- only a DialogContent tall enough to scroll ever shows the difference.
// `z-10` + the close button's own `z-20` (see above) keeps the button above
// this once both are competing for the same top-right corner while stuck.
export const DialogHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div
    className={cn(
      "sticky -top-6 -mx-6 -mt-6 z-10 flex flex-col gap-1.5 bg-background px-6 pt-6",
      className,
    )}
    {...props}
  />
);

export const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

// Same bleed-and-restore trick as DialogHeader, mirrored to the bottom edge
// (-bottom-6/-mb-6/pb-6, matching @bmsuisse/datagrid's own sticky grand-total
// row, which sticks to the bottom of ITS scroll container the same way). The
// original `mt-4` (margin, for the gap above the footer) becomes `pt-4`
// (padding) -- margin would collapse into whatever's above it once bled to
// the edge, padding won't, and it needs to be part of this element's own box
// for the sticky background to cover it once docked.
export const DialogFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div
    className={cn(
      "sticky -bottom-6 -mx-6 -mb-6 z-10 flex justify-end gap-2 bg-background px-6 pb-6 pt-4",
      className,
    )}
    {...props}
  />
);
