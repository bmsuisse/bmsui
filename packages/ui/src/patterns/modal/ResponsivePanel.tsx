import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from "react";
import { useRef, useState } from "react";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogBody,
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
  xl: "max-w-7xl",
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
const VIEWPORT_MARGIN = 16;

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const cornerCursor: Record<Corner, string> = {
  "top-left": "cursor-nwse-resize",
  "bottom-right": "cursor-nwse-resize",
  "top-right": "cursor-nesw-resize",
  "bottom-left": "cursor-nesw-resize",
};

const cornerPosition: Record<Corner, string> = {
  "top-left": "left-0 top-0",
  "top-right": "right-0 top-0",
  "bottom-left": "left-0 bottom-0",
  "bottom-right": "right-0 bottom-0",
};

const cornerGripPosition: Record<Corner, string> = {
  "top-left": "left-1 top-1 border-l-2 border-t-2",
  "top-right": "right-1 top-1 border-r-2 border-t-2",
  "bottom-left": "left-1 bottom-1 border-l-2 border-b-2",
  "bottom-right": "right-1 bottom-1 border-r-2 border-b-2",
};

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DragState {
  mode: "move" | "resize";
  corner?: Corner;
  x: number;
  y: number;
  rect: Rect;
}

// Drag the dialog's header to move it, or a corner handle to resize it from
// that corner (the opposite corner stays anchored). Radix centers the dialog
// with a translate-based className, so once the user starts dragging we
// switch to explicit fixed left/top/width/height (inline styles beat the
// class-based transform/size utilities) and never go back to the centered
// layout for that open panel. Both left/top and width/height are always
// clamped to a viewport margin so the panel can never end up positioned
// (partly) off-screen with no way to drag it back.
//
// The anchor rect for a new drag comes from `lastRect` (the geometry we set
// ourselves on the previous drag) rather than a fresh `getBoundingClientRect()`
// call whenever one is available — re-measuring the DOM right as a new
// pointerdown fires occasionally raced with layout and returned a stale box,
// which made a resize immediately after a move jump the panel off-screen.
function useDesktopPanelGeometry(): {
  style: CSSProperties | undefined;
  isDragging: boolean;
  startMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  startResize: (corner: Corner) => (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
} {
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<DragState | null>(null);
  const lastRect = useRef<Rect | null>(null);

  const beginDrag =
    (mode: "move" | "resize", corner?: Corner) =>
    (e: ReactPointerEvent<HTMLDivElement>): void => {
      const content = e.currentTarget.closest('[data-slot="dialog-content"]');
      if (!(content instanceof HTMLElement)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const domRect = content.getBoundingClientRect();
      const rect = lastRect.current ?? {
        left: domRect.left,
        top: domRect.top,
        width: domRect.width,
        height: domRect.height,
      };
      drag.current = { mode, corner, x: e.clientX, y: e.clientY, rect };
      setIsDragging(true);
    };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const state = drag.current;
    if (!state) return;
    const deltaX = e.clientX - state.x;
    const deltaY = e.clientY - state.y;

    if (state.mode === "move") {
      const maxLeft = window.innerWidth - VIEWPORT_MARGIN - state.rect.width;
      const maxTop = window.innerHeight - VIEWPORT_MARGIN - state.rect.height;
      const next: Rect = {
        left: Math.min(maxLeft, Math.max(VIEWPORT_MARGIN, state.rect.left + deltaX)),
        top: Math.min(maxTop, Math.max(VIEWPORT_MARGIN, state.rect.top + deltaY)),
        width: state.rect.width,
        height: state.rect.height,
      };
      lastRect.current = next;
      setStyle({ position: "fixed", transform: "none", translate: "none", maxWidth: "none", maxHeight: "none", ...next });
      return;
    }

    const corner = state.corner ?? "top-left";
    const growsLeft = corner === "top-left" || corner === "bottom-left";
    const growsUp = corner === "top-left" || corner === "top-right";
    const right = state.rect.left + state.rect.width;
    const bottom = state.rect.top + state.rect.height;
    const maxWidth = window.innerWidth - VIEWPORT_MARGIN * 2;
    const maxHeight = window.innerHeight - VIEWPORT_MARGIN * 2;

    let width = Math.max(
      MIN_PANEL_WIDTH,
      Math.min(maxWidth, growsLeft ? state.rect.width - deltaX : state.rect.width + deltaX),
    );
    let height = Math.max(
      MIN_PANEL_HEIGHT,
      Math.min(maxHeight, growsUp ? state.rect.height - deltaY : state.rect.height + deltaY),
    );

    // Clamp the moving edge to the viewport margin too, so growing toward
    // an edge never pushes the opposite (anchored) edge off-screen.
    const left = growsLeft ? right - Math.min(width, right - VIEWPORT_MARGIN) : state.rect.left;
    width = growsLeft ? right - left : Math.min(width, window.innerWidth - VIEWPORT_MARGIN - state.rect.left);

    const top = growsUp ? bottom - Math.min(height, bottom - VIEWPORT_MARGIN) : state.rect.top;
    height = growsUp ? bottom - top : Math.min(height, window.innerHeight - VIEWPORT_MARGIN - state.rect.top);

    const next: Rect = { left, top, width, height };
    lastRect.current = next;
    setStyle({ position: "fixed", transform: "none", translate: "none", maxWidth: "none", maxHeight: "none", ...next });
  };

  const onPointerUp = (): void => {
    drag.current = null;
    setIsDragging(false);
  };

  return {
    style,
    isDragging,
    startMove: beginDrag("move"),
    startResize: (corner) => beginDrag("resize", corner),
    onPointerMove,
    onPointerUp,
  };
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
   * Adds drag handles so the user can resize the panel with the mouse:
   * on desktop, a grip on all four corners (each anchors the opposite
   * corner, so `size` just becomes the starting size); on the mobile
   * drawer, a handle at the top (drags height between 30vh and 95vh).
   * Default `false`.
   */
  resizable?: boolean;
  /**
   * Desktop only: lets the user drag the panel by its header to reposition
   * it anywhere in the viewport. Default `false`. No effect on the mobile
   * drawer, which is always docked to the bottom.
   */
  draggable?: boolean;
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
  draggable = false,
  closeOnOutsideClick = true,
}: ResponsivePanelProps): ReactElement => {
  const isDesktop = useMediaQuery(breakpoint);
  const geometry = useDesktopPanelGeometry();
  const onInteractOutside = closeOnOutsideClick ? undefined : (e: Event): void => e.preventDefault();

  if (isDesktop) {
    const corners: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-slot="dialog-content"
          onInteractOutside={onInteractOutside}
          style={resizable || draggable ? geometry.style : undefined}
          className={cn(
            "max-h-[85vh] transition-shadow duration-150 ease-out",
            geometry.isDragging && "shadow-2xl ring-2 ring-primary/30",
            desktopSizeClasses[size],
            className,
          )}
        >
          {resizable &&
            corners.map((corner) => (
              <div
                key={corner}
                data-testid={`panel-resize-handle-${corner}`}
                className={cn(
                  "group absolute h-4 w-4 touch-none",
                  cornerPosition[corner],
                  cornerCursor[corner],
                )}
                onPointerDown={geometry.startResize(corner)}
                onPointerMove={geometry.onPointerMove}
                onPointerUp={geometry.onPointerUp}
                onPointerCancel={geometry.onPointerUp}
              >
                <div
                  className={cn(
                    "absolute h-2 w-2 scale-100 border-muted-foreground/40 transition-transform duration-150 group-hover:scale-125 group-hover:border-primary/60",
                    cornerGripPosition[corner],
                  )}
                />
              </div>
            ))}
          <DialogHeader
            className={cn(draggable && "touch-none cursor-move select-none")}
            onPointerDown={draggable ? geometry.startMove : undefined}
            onPointerMove={draggable ? geometry.onPointerMove : undefined}
            onPointerUp={draggable ? geometry.onPointerUp : undefined}
            onPointerCancel={draggable ? geometry.onPointerUp : undefined}
          >
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <DialogBody>{children}</DialogBody>
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
