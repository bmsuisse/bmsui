import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useRef } from "react";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { useVisualViewportHeight } from "../../lib/useVisualViewportHeight";
import { cn } from "../../lib/utils";
import { SearchPanel, type SearchPanelProps } from "./SearchPanel";

export interface SearchOverlayProps extends Omit<SearchPanelProps, "expanded" | "appearance" | "className"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Results, recents, empty state — whatever belongs under the input. Scrolls on its own. */
  children?: ReactNode;
  /** Pinned below the results, e.g. keyboard hints on desktop or a "search everything" action. */
  footer?: ReactNode;
  /**
   * `matchMedia` query that switches from the phone takeover to the desktop
   * palette. @default "(min-width: 768px)"
   */
  breakpoint?: string;
  /** Screen-reader title for the dialog. @default "Search" */
  title?: string;
  /** Accessible label of the phone takeover's back button. @default "Close search" */
  closeLabel?: string;
  /** Extra classes for the dialog surface (e.g. a wider desktop palette). */
  className?: string;
}

/**
 * Global search presentation. On a phone it takes over the screen — input at
 * the top under a back button, results scrolling beneath, the whole thing
 * sized to the visual viewport so the keyboard never covers the results. From
 * `breakpoint` up it is a centered command-palette dialog. Headless on
 * results (render them as `children`); controlled via `open`/`onOpenChange`.
 * Escape clears a non-empty query first and closes on the second press.
 */
export function SearchOverlay({
  open,
  onOpenChange,
  children,
  footer,
  breakpoint = "(min-width: 768px)",
  title = "Search",
  closeLabel = "Close search",
  className,
  inputRef,
  value,
  onChange,
  onClear,
  ...panelProps
}: SearchOverlayProps): ReactElement {
  const isDesktop = useMediaQuery(breakpoint);
  const viewportHeight = useVisualViewportHeight();
  const innerRef = useRef<HTMLInputElement | null>(null);

  const setRefs = (node: HTMLInputElement | null): void => {
    innerRef.current = node;
    if (typeof inputRef === "function") inputRef(node);
    else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = node;
  };

  const panel = (
    <SearchPanel
      {...panelProps}
      appearance="flush"
      value={value}
      onChange={onChange}
      onClear={onClear}
      inputRef={setRefs}
      className={cn("min-w-0 flex-1 bg-transparent", isDesktop && "border-b border-border")}
    />
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/30 transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none",
            !isDesktop && "bg-background",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Radix would focus the first tabbable (the back button on a phone).
          // Two frames after mount is as tight to the opening tap as a
          // conditionally-mounted input allows, and iOS Safari only raises the
          // keyboard for a focus() it still considers part of that tap.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => requestAnimationFrame(() => innerRef.current?.focus()));
          }}
          onEscapeKeyDown={(event) => {
            if (value.length > 0 && onClear !== false) {
              event.preventDefault();
              if (onClear) onClear();
              else onChange("");
            }
          }}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-background text-foreground focus:outline-none",
            isDesktop
              ? "top-[10vh] left-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_24px_48px_-16px_rgb(0_0_0/0.28)] transition-[opacity,translate,scale] duration-200 ease-out starting:translate-y-2 starting:scale-[0.98] starting:opacity-0 motion-reduce:transition-none"
              : "inset-x-0 top-0 transition-[opacity,translate] duration-200 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none",
            className,
          )}
          style={
            isDesktop
              ? { maxHeight: "min(72vh, 640px)" }
              : // Track the *visual* viewport so the on-screen keyboard shrinks the
                // scroll area instead of hiding the bottom results behind itself.
                { height: viewportHeight != null ? `${viewportHeight}px` : "100dvh" }
          }
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>

          {isDesktop ? (
            panel
          ) : (
            <div className="flex items-start border-b border-border pt-[env(safe-area-inset-top)] pl-1">
              <DialogPrimitive.Close
                aria-label={closeLabel}
                className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </DialogPrimitive.Close>
              {panel}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {children}
          </div>

          {footer && <div className="shrink-0 border-t border-border">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
