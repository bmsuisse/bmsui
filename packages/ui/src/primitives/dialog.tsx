import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type {
  ComponentPropsWithoutRef,
  ElementRef,
  HTMLAttributes,
  ReactElement,
  RefObject,
} from "react";
import { forwardRef, useCallback, useLayoutEffect, useRef } from "react";
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
        "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] [--dialog-divider:color-mix(in_oklab,var(--color-foreground)_12%,transparent)] dark:[--dialog-divider:var(--color-border)] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-background shadow-lg",
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
          <XMarkIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

// `shrink-0` -- never gives up space to DialogBody's `flex-1`. Opaque
// `bg-background` (DialogContent's own surface) plus an inset hairline
// (`--dialog-divider`, set on DialogContent: `--color-border` is too faint on
// the light surface, so light mode uses 12% foreground instead) that
// only shows while DialogBody is scrolled away from its top (see
// useScrollEdges below). `pb-3` + DialogBody's `pt-1` = 16px between the
// title and the first field (https://github.com/bmsuisse/bmsui/issues/71).
// Deliberately not `position: relative`/z-indexed: ResponsivePanel's
// absolute corner resize handles must keep painting above it.
export const DialogHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div
    data-slot="dialog-header"
    className={cn(
      "flex shrink-0 flex-col gap-1.5 bg-background px-6 pb-3 pt-6 transition-shadow [&:has(+[data-overflow-top])]:shadow-[inset_0_-1px_0_var(--dialog-divider)]",
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

// Toggles `data-overflow-top`/`data-overflow-bottom` on a scroll container
// while content is hidden above/below, so DialogHeader/DialogFooter can show a
// divider only when content actually scrolls under them. Set directly on the
// DOM node (no React state), so scrolling never re-renders the dialog.
function useScrollEdges(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = (): void => {
      el.toggleAttribute("data-overflow-top", el.scrollTop > 0.5);
      el.toggleAttribute(
        "data-overflow-bottom",
        el.scrollTop + el.clientHeight < el.scrollHeight - 0.5,
      );
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    // Observe the children too: content growing inside a DialogBody that is
    // already at its max height doesn't resize the body itself.
    const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    const observeChildren = (): void => {
      if (!resizeObserver) return;
      resizeObserver.disconnect();
      resizeObserver.observe(el);
      for (const child of Array.from(el.children)) resizeObserver.observe(child);
    };
    observeChildren();
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? undefined
        : new MutationObserver(() => {
            observeChildren();
            update();
          });
    mutationObserver?.observe(el, { childList: true });
    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [ref]);
}

// The one scrolling region. `min-h-0` overrides flexbox's default
// `min-height: auto` on a flex item, which otherwise refuses to shrink below
// its content's natural height and silently defeats `overflow-y-auto`.
// Padding lives inside the scroll area (so the first/last field's focus ring
// is never clipped): `pt-1` under DialogHeader's `pb-3`, and `pb-1` above a
// following DialogFooter's `pt-3` -- 16px either way -- or the dialog's own
// `pb-6` bottom inset when there's no footer. No negative margins: nothing
// overlaps DialogBody, so nothing can show through (#70). An empty body is
// `hidden` before a footer (ConfirmDialog/QuestionDialog keep their 16px
// description-to-buttons gap) and otherwise just tops the header's `pb-3` up
// to the dialog's 24px bottom inset.
export const DialogBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, forwardedRef) => {
    const ref = useRef<HTMLDivElement | null>(null);
    useScrollEdges(ref);
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        ref.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );
    return (
      <div
        ref={setRefs}
        data-slot="dialog-body"
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-1 empty:pb-3 empty:pt-0 [&:empty:has(+[data-slot=dialog-footer])]:hidden [&:has(+[data-slot=dialog-footer])]:pb-1",
          className,
        )}
        {...props}
      />
    );
  },
);
DialogBody.displayName = "DialogBody";

// `shrink-0`, like DialogHeader, with the same opaque `bg-background` and a
// hairline divider only while DialogBody has content hidden below it (#70).
// `pt-3` + DialogBody's `pb-1` = the original 16px gap above the buttons;
// `pt-1` when directly after DialogHeader (or an empty DialogBody), so
// ConfirmDialog keeps its 16px (header `pb-3` + `pt-1`) between description
// and buttons. Not positioned, same reason as DialogHeader.
export const DialogFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div
    data-slot="dialog-footer"
    className={cn(
      "flex shrink-0 justify-end gap-2 bg-background px-6 pb-6 pt-3 transition-shadow [[data-overflow-bottom]+&]:shadow-[inset_0_1px_0_var(--dialog-divider)] [[data-slot=dialog-body]:empty+&]:pt-1 [[data-slot=dialog-header]+&]:pt-1",
      className,
    )}
    {...props}
  />
);
