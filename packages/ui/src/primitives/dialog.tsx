import { forwardRef } from "react";
import { useMediaQuery } from "../lib/useMediaQuery";
import { cn } from "../lib/utils";
import { DialogCenteredContent, type DialogPopupProps } from "./dialog-base";
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
    const isDesktop = useMediaQuery(breakpoint);
    if (isDesktop || alwaysCentered) {
      return <DialogCenteredContent ref={ref} className={className} {...props} />;
    }
    return (
      <SheetContent
        ref={ref}
        side="bottom"
        resizable
        keyboardAware={keyboardAware}
        className={cn("gap-0 rounded-t-2xl p-0", "max-h-[92dvh]", className, "max-w-none")}
        {...props}
      />
    );
  },
);
DialogContent.displayName = "DialogContent";
