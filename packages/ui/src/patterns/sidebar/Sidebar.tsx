import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";
import { TooltipProvider } from "../../primitives/tooltip";
import { SidebarContextProvider } from "./context";

function resolve<T>(value: T | ((collapsed: boolean) => T), collapsed: boolean): T {
  return typeof value === "function" ? (value as (collapsed: boolean) => T)(collapsed) : value;
}

export interface SidebarProps {
  /** Rail-collapse the whole sidebar to an icon-only strip. Controlled. */
  collapsed?: boolean;
  /** Renders a built-in collapse/expand toggle button and fires when it's clicked. Omit to hide the toggle and drive `collapsed` some other way. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Lets the user drag the trailing edge to resize. @default false */
  resizable?: boolean;
  /** Controlled width in px (only meaningful while expanded). */
  width?: number;
  onWidthChange?: (width: number) => void;
  /** Uncontrolled starting width in px, and the double-click-to-reset target. @default 240 */
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** Width of the icon-only rail. @default 56 */
  railWidth?: number;
  /** Logo/wordmark slot. Pass a function to swap in a compact mark once `collapsed` — the shared component only owns the collapse *toggle button*, not your branding. */
  header?: ReactNode | ((collapsed: boolean) => ReactNode);
  /** Pinned below the scrollable nav area (e.g. a user-profile row), outside the scroll-fade. */
  footer?: ReactNode | ((collapsed: boolean) => ReactNode);
  children: ReactNode;
  className?: string;
}

/**
 * App shell's left navigation panel: fixed-width or drag-resizable, with an
 * optional icon-only rail-collapse mode (tooltips on hover, via `NavItem`).
 * Renders `children` (typically one or more `NavGroup`s of `NavItem`s)
 * inside a scrollable area with a bottom scroll-fade once content overflows.
 *
 * For a mobile drawer, don't reuse `Sidebar` itself (its resize handle and
 * rail-collapse don't apply there) — render the same `NavGroup`/`NavItem`
 * children inside a `Sheet`, wrapped in the separately-exported `SidebarNav`
 * for the scroll-fade behavior.
 */
export function Sidebar({
  collapsed = false,
  onCollapsedChange,
  resizable = false,
  width,
  onWidthChange,
  defaultWidth = 240,
  minWidth = 180,
  maxWidth = 420,
  railWidth = 56,
  header,
  footer,
  children,
  className,
}: SidebarProps): ReactElement {
  const [internalWidth, setInternalWidth] = useState(defaultWidth);
  const currentWidth = width ?? internalWidth;
  const [isDragging, setIsDragging] = useState(false);

  const setWidth = useCallback(
    (next: number) => {
      const clamped = Math.min(maxWidth, Math.max(minWidth, next));
      onWidthChange?.(clamped);
      if (width === undefined) setInternalWidth(clamped);
    },
    [maxWidth, minWidth, onWidthChange, width],
  );

  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { x: event.clientX, width: currentWidth };
    setIsDragging(true);
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    setWidth(dragStartRef.current.width + (event.clientX - dragStartRef.current.x));
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    setIsDragging(false);
  };

  return (
    <SidebarContextProvider value={{ collapsed }}>
      <TooltipProvider delayDuration={200}>
        <aside
          style={{ width: collapsed ? railWidth : currentWidth }}
          className={cn(
            "relative flex h-full shrink-0 flex-col border-r border-border bg-sidebar",
            !isDragging && "transition-[width] duration-150",
            className,
          )}
        >
          {(header || onCollapsedChange) && (
            <div className="flex h-16 items-center gap-2 border-b border-border px-3">
              {header && <div className="min-w-0 flex-1">{resolve(header, collapsed)}</div>}
              {onCollapsedChange && (
                <button
                  type="button"
                  onClick={() => onCollapsedChange(!collapsed)}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4" aria-hidden />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" aria-hidden />
                  )}
                </button>
              )}
            </div>
          )}

          <SidebarNav>{children}</SidebarNav>

          {footer && <div className="border-t border-border/50 px-2 py-2">{resolve(footer, collapsed)}</div>}

          {resizable && !collapsed && (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onDoubleClick={() => setWidth(defaultWidth)}
              className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none hover:bg-primary/40"
            />
          )}
        </aside>
      </TooltipProvider>
    </SidebarContextProvider>
  );
}

export type SidebarNavProps = {
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children" | "ref">;

/**
 * The scrollable nav-item area, with a bottom scroll-fade once content
 * overflows. Used internally by `Sidebar`; exported separately so a mobile
 * drawer can wrap the same `NavGroup`/`NavItem` children in it without the
 * rest of the `Sidebar` shell. Extra props (`onClick`, `data-testid`, …)
 * forward to the scrollable element itself — e.g. `onClick` to close a
 * mobile drawer when any nav link inside is tapped.
 */
export function SidebarNav({ children, className, ...rest }: SidebarNavProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setShowFade(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
    update();
    el.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={ref}
        className={cn("flex flex-1 flex-col gap-3 overflow-y-auto px-2 py-2", className)}
        {...rest}
      >
        {children}
      </div>
      {showFade && (
        <div
          className="pointer-events-none absolute right-0 bottom-0 left-0 h-6 bg-gradient-to-t from-sidebar to-transparent"
          aria-hidden
        />
      )}
    </div>
  );
}
