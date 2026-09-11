import type { ReactElement, ReactNode } from "react";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../primitives/sheet";

const desktopSizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

const drawerSizeClasses = {
  sm: "max-h-[50vh]",
  md: "max-h-[70vh]",
  lg: "max-h-[90vh]",
  xl: "max-h-[96vh]",
} as const;

export type ResponsivePanelSize = keyof typeof desktopSizeClasses;

export interface ResponsivePanelProps {
  /** Whether the panel is open. Fully controlled — no internal open state. */
  open: boolean;
  /** Called when Radix wants to change the open state (backdrop click, Esc, close button). */
  onOpenChange: (open: boolean) => void;
  /** Panel title. */
  title: string;
  /** Optional supporting copy shown under the title. */
  description?: string;
  /** Body content of the panel. */
  children: ReactNode;
  /** Optional footer content (typically action buttons). */
  footer?: ReactNode;
  /** Extra classes applied to the panel content, e.g. to override the default width/height. */
  className?: string;
  /**
   * `matchMedia` query that decides desktop vs. mobile layout. Defaults to
   * Tailwind's `lg` breakpoint, matching the rest of `@bmsuisse/ui`'s responsive patterns.
   */
  breakpoint?: string;
  /**
   * Panel size, `sm`/`md`/`lg` (default)/`xl`. On desktop this is the dialog
   * width (`max-w-md`/`max-w-xl`/`max-w-2xl`/`max-w-4xl`); on mobile — where
   * width is always full-bleed — it's the drawer's max height instead
   * (`50vh`/`70vh`/`90vh`/`96vh`).
   */
  size?: ResponsivePanelSize;
}

/**
 * Like `Modal`, but uses the extra desktop space instead of a fixed small
 * dialog, and becomes a native bottom-sheet drawer below `breakpoint` — a
 * centered floating box with its own scroll region reads as a leftover
 * desktop shape on a phone. Use this over `Modal` for content that benefits
 * from more room (multi-section forms, longer lists) on both form factors.
 */
export const ResponsivePanel = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  breakpoint = "(min-width: 1024px)",
  size = "lg",
}: ResponsivePanelProps): ReactElement => {
  const isDesktop = useMediaQuery(breakpoint);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn("max-h-[85vh] overflow-y-auto", desktopSizeClasses[size], className)}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
          {footer ? <DialogFooter>{footer}</DialogFooter> : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex flex-col overflow-y-auto rounded-t-2xl",
          drawerSizeClasses[size],
          className,
        )}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        {children}
        {footer ? <SheetFooter>{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
};
