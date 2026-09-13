import { Plus } from "lucide-react";
import type { ComponentType, ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { useVisualViewportHeight } from "../../lib/useVisualViewportHeight";
import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";
import { ActionSheet } from "./ActionSheet";

/** One row of the sheet/menu: an icon tile, a label, and an optional muted sublabel. */
export interface ActionItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
  disabled?: boolean;
}

export interface ActionButtonProps {
  /** aria-label, e.g. "Quick actions". */
  label: string;
  /** @default Plus (lucide) */
  icon?: ComponentType<{ className?: string }>;
  /** Single-action mode: renders a plain button, no sheet/menu at all. */
  onClick?: () => void;
  /** Multi-action mode: an `ActionSheet` on phone, a `DropdownMenu` from `md`. */
  actions?: ActionItem[];
  /** Divider-separated utility group (search, feedback, back). Sheet/menu only. */
  secondaryActions?: ActionItem[];
  /** Sheet heading, e.g. "New". Ignored on desktop (the dropdown has no title row). */
  sheetTitle?: string;
  /** `corner`: fixed bottom-right/left. `docked`: static, for a consumer's tab-bar slot. @default "corner" */
  placement?: "corner" | "docked";
  /** `corner` only: which side it hugs. @default "right" */
  side?: "right" | "left";
  /** Consumer route logic (e.g. hide on `/chat`). Unmounts the FAB-column reservation too. */
  hidden?: boolean;
  /** Slide the button off-screen while an on-screen keyboard is up. @default true */
  hideOnKeyboard?: boolean;
  /** Controlled open state for the sheet/menu. Omit for uncontrolled. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * `matchMedia` query that switches the sheet for a dropdown menu and the
   * 56px FAB for a 36px trigger. Defaults to Tailwind's `md` breakpoint,
   * matching the rest of `@bmsuisse/ui`'s responsive patterns.
   */
  breakpoint?: string;
}

/** More than this many px of visual-viewport shrink versus the tallest we've
 * observed means an on-screen keyboard opened, not just a URL bar collapsing. */
const KEYBOARD_SHRINK_THRESHOLD = 150;

// Reference-counted per side rather than a plain boolean: a consuming app
// shouldn't mount two corner FABs at once, but two independent features each
// owning their own corner ActionButton during a route transition (old page
// unmounting, new one already mounted) is plausible, and neither should be
// able to clobber the other's reservation on unmount. The attribute can only
// hold one side at a time, so `right` wins the (rare, transient) case where
// both sides are simultaneously mounted.
const fabCounts: Record<"left" | "right", number> = { left: 0, right: 0 };

function syncFabAttribute(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (fabCounts.right > 0) root.setAttribute("data-ui-fab", "right");
  else if (fabCounts.left > 0) root.setAttribute("data-ui-fab", "left");
  else root.removeAttribute("data-ui-fab");
}

/**
 * Sets `data-ui-fab="left" | "right"` on `<html>` for as long as a corner
 * ActionButton is mounted with that side, so `ToastProvider`'s viewport can
 * reserve a column for it via a plain CSS attribute selector — no React
 * state coupling between the two patterns. `placement="docked"` (a tab-bar
 * slot, not floating over content) never calls this.
 */
function useFabReservation(side: "left" | "right" | null): void {
  useEffect(() => {
    if (!side) return;
    fabCounts[side] += 1;
    syncFabAttribute();
    return () => {
      fabCounts[side] -= 1;
      syncFabAttribute();
    };
  }, [side]);
}

function ActionTile({
  icon: TileIcon,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: "primary" | "muted";
}): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md",
        tone === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      <TileIcon className="size-4" />
    </span>
  );
}

/**
 * The floating "+" that replaces a product's tab-bar FAB and its hand-rolled
 * bottom sheets: a 56px circle on the phone that opens an `ActionSheet` list
 * (a radial speed-dial was rejected — 40px unlabeled targets, no room for
 * 6-8 contextual actions, poor screen-reader story), and a 36px trigger with
 * a `DropdownMenu` from `md` up, where a menu anchored to the cursor is the
 * native affordance instead of a full-width sheet.
 */
export const ActionButton = ({
  label,
  icon,
  onClick,
  actions,
  secondaryActions,
  sheetTitle,
  placement = "corner",
  side = "right",
  hidden = false,
  hideOnKeyboard = true,
  open,
  onOpenChange,
  breakpoint = "(min-width: 768px)",
}: ActionButtonProps): ReactElement | null => {
  const Icon = icon ?? Plus;
  const isMultiAction = (actions?.length ?? 0) > 0;
  const isDesktop = useMediaQuery(breakpoint);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? (open ?? false) : uncontrolledOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  // Keyboard-avoidance: compare the current visual viewport height against
  // the tallest one observed so far (its value with no keyboard up). A drop
  // past the threshold means an on-screen keyboard opened. This replaces a
  // consuming app's DOM-focus heuristics ("did an <input> just get focus")
  // with a viewport measurement, which also survives focus staying on a
  // non-text control while a keyboard-adjacent picker is open.
  const viewportHeight = useVisualViewportHeight();
  const [maxViewportHeight, setMaxViewportHeight] = useState<number | null>(null);
  useEffect(() => {
    if (viewportHeight == null) return;
    setMaxViewportHeight((prev) => (prev == null ? viewportHeight : Math.max(prev, viewportHeight)));
  }, [viewportHeight]);
  const keyboardHidden =
    hideOnKeyboard &&
    viewportHeight != null &&
    maxViewportHeight != null &&
    maxViewportHeight - viewportHeight > KEYBOARD_SHRINK_THRESHOLD;

  const fabSide = placement === "corner" && !hidden ? side : null;
  useFabReservation(fabSide);

  if (hidden) return null;

  const sizeClass = isDesktop ? "size-9" : "size-14";
  const iconSizeClass = isDesktop ? "size-4" : "size-6";

  const buttonClassName = cn(
    "inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
    "transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
    "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    sizeClass,
    // Same depth recipe as ToastProvider's ToastItem (offset + soft blur, no
    // flat halo) so a floating button and a floating toast read as one system.
    "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.28),0_2px_6px_-2px_rgba(0,0,0,0.12)]",
    // Punches the circle out of a consumer's flat tab-bar slot.
    placement === "docked" && "ring-4 ring-background",
    placement === "corner" && [
      "fixed",
      side === "left" ? "left-[max(1rem,env(safe-area-inset-left))]" : "right-[max(1rem,env(safe-area-inset-right))]",
      "bottom-[var(--ui-bottom-inset,env(safe-area-inset-bottom,0px))]",
      // Deliberate stack position: above ordinary page content, below every
      // z-50 overlay primitive this library ships (Dialog/Sheet/DropdownMenu/
      // Popover), and far below the Toast viewport's z-[100] — an open
      // overlay or a toast must never sit under the FAB.
      "z-40",
    ],
    keyboardHidden && [
      "pointer-events-none opacity-0",
      placement === "corner" && "translate-y-24",
    ],
  );

  const triggerContent = (
    <Icon
      className={cn(
        iconSizeClass,
        "transition-transform duration-200 ease-out motion-reduce:transition-none",
        isMultiAction && isOpen && "rotate-45",
      )}
      aria-hidden="true"
    />
  );

  const commonTriggerProps = {
    type: "button" as const,
    "aria-label": label,
    className: buttonClassName,
    // A keyboard-hidden button stays mounted (so it can slide back in) but
    // must not be reachable by Tab or a screen reader while off-screen.
    tabIndex: keyboardHidden ? -1 : undefined,
    "aria-hidden": keyboardHidden ? true : undefined,
  };

  if (!isMultiAction) {
    return (
      <button {...commonTriggerProps} onClick={onClick}>
        {triggerContent}
      </button>
    );
  }

  const items = actions ?? [];

  if (isDesktop) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button {...commonTriggerProps} aria-haspopup="menu" aria-expanded={isOpen}>
            {triggerContent}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={side === "left" ? "start" : "end"} side="top" className="w-64 p-1.5">
          {items.map((action) => (
            <DropdownMenuItem
              key={action.id}
              disabled={action.disabled}
              onSelect={() => action.onSelect()}
              className="gap-3 rounded-md py-2"
            >
              <ActionTile icon={action.icon} tone="primary" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{action.label}</span>
                {action.sublabel != null && (
                  <span className="truncate text-xs text-muted-foreground">{action.sublabel}</span>
                )}
              </span>
            </DropdownMenuItem>
          ))}
          {secondaryActions != null && secondaryActions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {secondaryActions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  disabled={action.disabled}
                  onSelect={() => action.onSelect()}
                  className="gap-3 rounded-md py-2"
                >
                  <ActionTile icon={action.icon} tone="muted" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">{action.label}</span>
                    {action.sublabel != null && (
                      <span className="truncate text-xs text-muted-foreground">{action.sublabel}</span>
                    )}
                  </span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <button
        {...commonTriggerProps}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
      >
        {triggerContent}
      </button>
      <ActionSheet
        open={isOpen}
        onOpenChange={setOpen}
        title={sheetTitle}
        actions={items}
        secondaryActions={secondaryActions}
      />
    </>
  );
};
