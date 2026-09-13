import type { ReactElement, ReactNode, RefObject } from "react";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { cn } from "../../lib/utils";
import { EmptyState, type EmptyStateProps } from "../empty-state/EmptyState";
import { Button } from "../../primitives/button";
import { Popover, PopoverAnchor, PopoverContent } from "../../primitives/popover";
import { ScrollArea } from "../../primitives/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../../primitives/sheet";

export interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Desktop Popover anchor — the bell. */
  anchor?: RefObject<HTMLElement | null>;
  /** `NotificationCard[]` — the panel is headless about data; the consumer maps its own query into rows. */
  children: ReactNode;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  unreadCount?: number;
  onMarkAllRead?: () => void;
  /** e.g. a "View all" link. */
  footer?: ReactNode;
  /** Reuses EmptyState; default variant "empty" with a Bell icon. */
  emptyState?: Partial<EmptyStateProps>;
  labels?: {
    title?: string;
    markAllRead?: string;
    empty?: string;
    loading?: string;
    error?: string;
    retry?: string;
  };
}

function SkeletonRows(): ReactElement {
  return (
    <div className="flex flex-col gap-3 p-3" data-testid="notification-panel-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <span className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <span className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The inbox surface a `NotificationBell` opens: a header (title + optional
 * "Mark all read"), a scrolling list of `NotificationCard` rows the consumer
 * supplies as `children`, and an optional footer (e.g. "View all"). Headless
 * about data on purpose — this component owns none of it, so there is
 * nothing here to reconcile against a real backend.
 *
 * **Desktop (`md`+)**: a `Popover` anchored to the bell, 400px wide,
 * `max-h-[70vh]`. **Mobile**: a bottom `Sheet` at 85vh with a grabber —
 * deliberately *not* a right-side aside. The app this pattern was extracted
 * from ran a 320px desktop drawer squeezed onto phones; that squeeze, not a
 * hypothetical, is the thing a bottom sheet fixes here.
 *
 * Non-goals (the consumer's job, not this component's): "New"/"Earlier"
 * section grouping — order `children` however you like; data fetching and
 * realtime updates; notification preferences; syncing read state back to a
 * server; desktop drag-resize of the panel (unlike `ResponsivePanel`, this
 * is a fixed-size inbox, not a workspace the user reshapes).
 */
export const NotificationPanel = ({
  open,
  onOpenChange,
  anchor,
  children,
  loading = false,
  error = false,
  onRetry,
  unreadCount = 0,
  onMarkAllRead,
  footer,
  emptyState,
  labels,
}: NotificationPanelProps): ReactElement => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const title = labels?.title ?? "Notifications";
  const markAllReadLabel = labels?.markAllRead ?? "Mark all read";
  const errorTitle = labels?.error ?? "Couldn't load notifications";
  const retryLabel = labels?.retry ?? "Retry";
  const showMarkAllRead = Boolean(onMarkAllRead) && unreadCount > 0;

  const hasChildren = Array.isArray(children) ? children.length > 0 : children != null;

  const header = (
    <div className="flex items-center justify-between gap-2 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {showMarkAllRead && (
        <Button type="button" variant="ghost" size="sm" onClick={onMarkAllRead}>
          {markAllReadLabel}
        </Button>
      )}
    </div>
  );

  const body = loading ? (
    <SkeletonRows />
  ) : error ? (
    <EmptyState
      variant="error"
      title={errorTitle}
      action={onRetry ? { label: retryLabel, onClick: onRetry } : undefined}
      className="py-8"
    />
  ) : !hasChildren ? (
    <EmptyState
      variant="empty"
      title={labels?.empty ?? "You're all caught up"}
      className="py-8"
      {...emptyState}
    />
  ) : (
    <div role="list" className="flex flex-col">
      {children}
    </div>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        {anchor && <PopoverAnchor virtualRef={anchor} />}
        <PopoverContent
          align="end"
          className="flex w-[400px] max-w-[calc(100vw-2rem)] max-h-[70vh] flex-col gap-0 p-0"
        >
          <div className="shrink-0 border-b border-border">{header}</div>
          <ScrollArea className="min-h-0 flex-1">{body}</ScrollArea>
          {footer && <div className="shrink-0 border-t border-border p-2">{footer}</div>}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        resizable
        className="flex max-h-[85vh] flex-col gap-0 rounded-t-2xl p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="shrink-0 border-b border-border">{header}</div>
        <ScrollArea className="min-h-0 flex-1">{body}</ScrollArea>
        {footer && (
          <div className={cn("shrink-0 border-t border-border p-3", "pb-[max(0.75rem,env(safe-area-inset-bottom))]")}>
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
