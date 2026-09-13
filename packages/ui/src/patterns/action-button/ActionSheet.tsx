import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../../primitives/sheet";
import type { ActionItem } from "./ActionButton";

export interface ActionSheetLabels {
  /** @default "Cancel" */
  cancel?: string;
}

export interface ActionSheetProps {
  /** Fully controlled — no internal open state. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional heading shown above the rows. */
  title?: string;
  actions: ActionItem[];
  /** Divider-separated utility group (search, feedback, back), rendered with
   * muted rather than primary-tinted icon tiles. */
  secondaryActions?: ActionItem[];
  /** Overridable default copy. */
  labels?: ActionSheetLabels;
}

function ActionRow({
  action,
  tone,
  buttonRef,
  onSelect,
}: {
  action: ActionItem;
  tone: "primary" | "muted";
  buttonRef?: (el: HTMLButtonElement | null) => void;
  onSelect: (action: ActionItem) => void;
}): ReactElement {
  const Icon = action.icon;
  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={action.disabled}
      onClick={() => onSelect(action)}
      // 56px+ row: a 40px icon tile, a 15px semibold label, a 12px muted
      // sublabel — sized for a thumb, not a mouse cursor.
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[15px] font-semibold text-foreground">{action.label}</span>
        {action.sublabel != null && (
          <span className="truncate text-xs text-muted-foreground">{action.sublabel}</span>
        )}
      </span>
    </button>
  );
}

/**
 * The bottom sheet behind `ActionButton`'s phone-width mode, also exported
 * standalone so it can replace a consuming app's own hand-rolled sheets
 * directly (this product had two divergent ones plus a tab-bar FAB before
 * this component existed).
 *
 * Radix's `Dialog` (which `Sheet` wraps) is documented to return focus to
 * whatever triggered the open once it closes. In practice, in jsdom (see the
 * "returns focus to the trigger on close" test) that restoration didn't
 * fire, so this component captures `document.activeElement` itself when it
 * opens and explicitly refocuses it when it closes, as a defensive fallback
 * on top of Radix's own behavior rather than instead of it.
 */
export const ActionSheet = ({
  open,
  onOpenChange,
  title,
  actions,
  secondaryActions,
  labels,
}: ActionSheetProps): ReactElement => {
  const firstRowRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Radix focuses the dialog's content wrapper on open, not necessarily the
  // first interactive child inside it. Move focus to the first row
  // explicitly so keyboard and screen-reader users land on a real,
  // activatable control instead of the unlabeled sheet surface. On close,
  // restore focus to whatever had it before opening (see class comment).
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const id = requestAnimationFrame(() => firstRowRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    previouslyFocused.current?.focus();
    return undefined;
  }, [open]);

  // Close the sheet FIRST, then run the action's own handler. Reversing this
  // order lets `onSelect` (often a navigation, or something else that
  // unmounts this tree) race the sheet's own close/unmount and the exit
  // animation; closing first guarantees the sheet is already on its way out
  // before the caller's side effect runs.
  function handleSelect(action: ActionItem): void {
    if (action.disabled) return;
    onOpenChange(false);
    action.onSelect();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex max-h-[85vh] flex-col gap-1 overflow-y-auto rounded-t-2xl p-3",
          // Respect a docked tab bar (via --ui-bottom-inset) and the safe
          // area, same formulation as ToastProvider's viewport padding.
          "pb-[max(1rem,calc(var(--ui-bottom-inset,env(safe-area-inset-bottom,0px))+0.5rem))]",
        )}
      >
        <div
          aria-hidden="true"
          className="mx-auto -mt-1 mb-1 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
        />
        {title != null && (
          <SheetHeader className="px-3 pb-1 pt-0">
            <SheetTitle className="text-base">{title}</SheetTitle>
          </SheetHeader>
        )}
        <div className="flex flex-col gap-0.5">
          {actions.map((action, index) => (
            <ActionRow
              key={action.id}
              action={action}
              tone="primary"
              buttonRef={index === 0 ? (el) => (firstRowRef.current = el) : undefined}
              onSelect={handleSelect}
            />
          ))}
        </div>
        {secondaryActions != null && secondaryActions.length > 0 && (
          <>
            <div role="separator" aria-orientation="horizontal" className="my-1 border-t border-border" />
            <div className="flex flex-col gap-0.5">
              {secondaryActions.map((action) => (
                <ActionRow key={action.id} action={action} tone="muted" onSelect={handleSelect} />
              ))}
            </div>
          </>
        )}
        <div role="separator" aria-orientation="horizontal" className="my-1 border-t border-border" />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex min-h-14 w-full items-center justify-center rounded-lg px-3 py-2 text-[15px] font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {labels?.cancel ?? "Cancel"}
        </button>
      </SheetContent>
    </Sheet>
  );
};
