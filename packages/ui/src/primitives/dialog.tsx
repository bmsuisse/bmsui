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

// A `flex flex-col` column, not a single `overflow-y-auto` box (v0.16.1's
// first attempt at this) -- DialogHeader/DialogFooter are `shrink-0` and
// DialogBody is the one `flex-1 overflow-y-auto` region, so only the body
// ever needs to scroll and its scrollbar only ever runs alongside the body,
// not the whole dialog. `overflow-hidden` (not `-auto`) here since this
// element itself no longer scrolls -- DialogBody does. `showCloseButton`'s
// button goes back to plain `absolute right-4 top-4`: since this box doesn't
// scroll anymore, an absolutely-positioned child of it stays visually put
// with no extra work, unlike the sticky/zero-height wrapper v0.16.1 needed
// (and got wrong -- see that version's own history) when this element itself
// was the one scrolling.
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
        "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-background shadow-lg",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <DialogPrimitive.Close
          data-testid={closeButtonTestId}
          className="absolute right-4 top-4 z-20 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

// `shrink-0` -- never gives up space to DialogBody's `flex-1`. Only `pt-6`
// (top + sides): DialogContent no longer supplies any padding of its own, and
// unlike DialogFooter's `mt-4` below, the original DialogHeader had no
// explicit bottom margin/padding at all, so there's nothing to preserve on
// this edge -- DialogBody's own top edge butts directly against it, exactly
// as before.
export const DialogHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("flex shrink-0 flex-col gap-1.5 px-6 pt-6", className)} {...props} />
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

// The one scrolling region. `min-h-0` overrides flexbox's default
// `min-height: auto` on a flex item, which otherwise refuses to shrink below
// its content's natural height and silently defeats `overflow-y-auto` --
// content would just keep growing DialogContent past `max-h-[85vh]` instead
// of ever scrolling. `pb-6` is this element's own fallback bottom padding for
// when there's no DialogFooter (Modal/ResponsivePanel's `footer` prop is
// optional); when a DialogFooter *is* present, its `-mt-6` exactly cancels
// this padding (both are the same "6" = 1.5rem Tailwind step) and replaces it
// with its own `pt-4`, matching the original `DialogFooter`'s `mt-4` gap
// above the buttons -- see DialogFooter below. No top padding here: nothing
// to preserve on that edge either (see DialogHeader above), and a bare
// `DialogContent`/`DialogBody` used with no `DialogHeader` needs its own
// top padding via `className`, same as it always needed *some* padding
// contributor on that edge.
export const DialogBody = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 pb-6", className)} {...props} />
);

// `-mt-6` cancels DialogBody's own `pb-6` (see above) so the two combined act
// as one continuous box with a single `pt-4` gap between the body's last
// content and the footer's buttons -- exactly the original `DialogFooter`'s
// plain `mt-4` margin, just relocated since a margin can't span two
// separately-padded flex siblings the way it could span one old undivided
// box. `shrink-0`, like DialogHeader.
export const DialogFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div
    className={cn("-mt-6 flex shrink-0 justify-end gap-2 px-6 pb-6 pt-4", className)}
    {...props}
  />
);
