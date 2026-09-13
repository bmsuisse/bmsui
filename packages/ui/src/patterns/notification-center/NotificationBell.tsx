import { Bell } from "lucide-react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface NotificationBellProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 0 hides the badge; >99 renders "99+". */
  count: number;
  /** Pressed styling — set this from the open state of whatever `NotificationPanel`/`Popover` this bell anchors. */
  open?: boolean;
  /** @default "Notifications" — the aria-label becomes e.g. "Notifications, 3 unread". */
  label?: string;
}

/**
 * The inbox entry point: a bell icon plus an unread-count badge, meant to sit
 * in a header/toolbar and anchor a `NotificationPanel`. This is a trigger
 * only — it holds no open/close state of its own (the consumer's `open`
 * boolean drives both this button's pressed look and the panel it opens),
 * which is why the ref is forwarded: `NotificationPanel`'s desktop Popover
 * anchors to this element.
 *
 * The count is deliberately not read aloud on every render — only the digits
 * live in an `aria-live="polite"` span, so a screen reader announces just
 * the new number when a notification arrives instead of re-reading "Bell
 * button, Notifications" on every unrelated re-render.
 */
export const NotificationBell = forwardRef<HTMLButtonElement, NotificationBellProps>(
  ({ count, open = false, label = "Notifications", className, ...props }, ref): ReactElement => {
    const hasBadge = count > 0;
    const display = count > 99 ? "99+" : String(count);
    const ariaLabel = hasBadge ? `${label}, ${count} unread` : label;

    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "md:size-9",
          open && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
          className,
        )}
        {...props}
      >
        <Bell className="size-5 md:size-[18px]" aria-hidden="true" />
        {hasBadge && (
          <span
            aria-live="polite"
            className={cn(
              "absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1",
              "text-[10px] font-semibold leading-none text-destructive-foreground",
              "md:top-0.5 md:right-0.5",
            )}
          >
            {display}
          </span>
        )}
      </button>
    );
  },
);
NotificationBell.displayName = "NotificationBell";
