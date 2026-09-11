import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from "react";
import { useRef, useState } from "react";
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

const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 240;
const VIEWPORT_MARGIN = 32;

// Drag the dialog's top-left corner to resize it, keeping the bottom-right
// corner anchored in place. Radix centers the dialog with a translate-based
// className, so once the user starts dragging we switch to explicit
// fixed left/top/width/height (which beats the class-based transform/size
// utilities since inline styles win over stylesheet classes) and never go
// back to the centered layout for that open panel.
function useCornerResize(): {
  style: CSSProperties | undefined;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
} {
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);
  const dragStart = useRef<{ x: number; y: number; rect: DOMRect } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const content = e.currentTarget.closest('[data-slot="dialog-content"]');
    if (!(content instanceof HTMLElement)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, rect: content.getBoundingClientRect() };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const start = dragStart.current;
    if (!start) return;
    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;
    const maxWidth = window.innerWidth - VIEWPORT_MARGIN;
    const maxHeight = window.innerHeight - VIEWPORT_MARGIN;
    const width = Math.min(maxWidth, Math.max(MIN_PANEL_WIDTH, start.rect.width - deltaX));
    const height = Math.min(maxHeight, Math.max(MIN_PANEL_HEIGHT, start.rect.height - deltaY));
    setStyle({
      position: "fixed",
      transform: "none",
      left: start.rect.right - width,
      top: start.rect.bottom - height,
      width,
      height,
      maxWidth: "none",
      maxHeight: "none",
    });
  };
  const onPointerUp = (): void => {
    dragStart.current = null;
  };

  return { style, onPointerDown, onPointerMove, onPointerUp };
}

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
  /**
   * Adds a drag handle so the user can resize the panel with the mouse:
   * a top-left corner grip on desktop (drags width/height, `size` becomes
   * just the starting size), and a top drag handle on the mobile drawer
   * (drags height between 30vh and 95vh). Default `false`.
   */
  resizable?: boolean;
  /**
   * Whether clicking/tapping outside the panel closes it. Default `true`.
   * When `false`, only the header's close button (and Esc) can close it —
   * use this for panels guarding unsaved work the user shouldn't lose to a
   * stray click.
   */
  closeOnOutsideClick?: boolean;
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
  resizable = false,
  closeOnOutsideClick = true,
}: ResponsivePanelProps): ReactElement => {
  const isDesktop = useMediaQuery(breakpoint);
  const cornerResize = useCornerResize();
  const onInteractOutside = closeOnOutsideClick ? undefined : (e: Event): void => e.preventDefault();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-slot="dialog-content"
          onInteractOutside={onInteractOutside}
          style={resizable ? cornerResize.style : undefined}
          className={cn("max-h-[85vh] overflow-y-auto", desktopSizeClasses[size], className)}
        >
          {resizable && (
            <div
              data-testid="panel-resize-handle"
              className="absolute left-0 top-0 h-4 w-4 touch-none cursor-nwse-resize"
              onPointerDown={cornerResize.onPointerDown}
              onPointerMove={cornerResize.onPointerMove}
              onPointerUp={cornerResize.onPointerUp}
              onPointerCancel={cornerResize.onPointerUp}
            >
              <div className="absolute left-1 top-1 h-2 w-2 border-l-2 border-t-2 border-muted-foreground/40" />
            </div>
          )}
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
        resizable={resizable}
        onInteractOutside={onInteractOutside}
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
