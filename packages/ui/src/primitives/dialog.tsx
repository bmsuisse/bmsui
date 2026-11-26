import { forwardRef, useEffect, useRef } from "react";
import { useMediaQuery } from "../lib/useMediaQuery";
import { cn } from "../lib/utils";
import { DialogCenteredContent, type DialogPopupProps, useDialog } from "./dialog-base";
import { SheetContent } from "./sheet";

export * from "./dialog-base";
export { DialogCenteredContent } from "./dialog-base";

/** Below this width a dialog is a bottom sheet (Tailwind's `lg`). */
export const DIALOG_DESKTOP_QUERY = "(min-width: 1024px)";

export type DialogContentProps = DialogPopupProps & {
  showCloseButton?: boolean;
  /** data-testid for the built-in close button, since it renders no DOM a caller controls directly. */
  closeButtonTestId?: string;
  /**
   * Keep the centred dialog at every width instead of becoming a bottom sheet below `breakpoint`. For
   * content that wants a fixed desktop-shaped box: a wide table, an image preview, a small picker whose
   * dropdown has to overflow the dialog's edges.
   */
  alwaysCentered?: boolean;
  /** `matchMedia` query for "desktop"; below it the dialog is a bottom sheet. Default: Tailwind's `lg`. */
  breakpoint?: string;
  /** Phone sheet only: lift it onto the on-screen keyboard (default `true`). */
  keyboardAware?: boolean;
};

/**
 * The one dialog surface: a centred dialog from `breakpoint` up, a bottom sheet (slide-up, drag handle,
 * swipe-friendly, `dvh`/safe-area aware) below it. A centred floating box with its own scroll reads as a
 * desktop leftover on a phone. `DialogHeader`/`DialogBody`/`DialogFooter` lay out identically in both.
 * `className` styles the centred dialog (width, height); the sheet is always full width.
 */
export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  (
    { alwaysCentered = false, breakpoint = DIALOG_DESKTOP_QUERY, keyboardAware = true, className, ...props },
    ref,
  ) => {
    const matchesDesktop = useMediaQuery(breakpoint);
    // The surface is chosen when the dialog opens and kept until it opens again, including through the exit
    // animation: crossing the breakpoint (an iPad rotating, a window resize) must not swap centred dialog
    // for sheet, which would remount the content and lose what the user typed, and swapping surfaces
    // mid-exit would mount a second popup into a dialog that is already closing.
    const { open } = useDialog();
    const surface = useRef(matchesDesktop);
    const wasOpen = useRef(false);
    if (open && !wasOpen.current) surface.current = matchesDesktop;
    useEffect(() => {
      wasOpen.current = open;
    }, [open]);
    const isDesktop = surface.current;
    if (isDesktop || alwaysCentered) {
      return <DialogCenteredContent ref={ref} className={className} {...props} />;
    }
    return (
      <SheetContent
        ref={ref}
        side="bottom"
        resizable
        keyboardAware={keyboardAware}
        // The built-in X is centred on the title row below the drag handle (header pt-3 + 28px title line).
        className={cn(
          "gap-0 rounded-t-2xl p-0 max-h-[92dvh] [--dialog-divider:color-mix(in_oklab,var(--color-foreground)_12%,transparent)] dark:[--dialog-divider:var(--color-border)] [&>[data-slot=sheet-close]]:top-[30px] max-md:[&>[data-slot=sheet-close]]:top-[26px]",
          className,
          "max-w-none",
        )}
        {...props}
      />
    );
  },
);
DialogContent.displayName = "DialogContent";
