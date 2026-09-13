import * as ToastPrimitive from "@radix-ui/react-toast";
import type { ReactElement, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { NotificationCard } from "./NotificationCard";
import {
  type NotificationBannerOptions,
  type NotificationBannerRecord,
  NotificationBannerStore,
} from "./notification-banner-store";

export interface NotificationBannerHostProps {
  /** @default "top" */
  position?: "top" | "bottom";
  /** How many banners are visible at once; the oldest non-`high` one retires first. @default 1 */
  max?: number;
  /** Default auto-dismiss delay in ms for `priority="normal"` banners. `priority="high"` never auto-dismisses. @default 8000 */
  duration?: number;
  /** Accessible name of the banner's live region. Kept distinct from the toast viewport's own label — see the module doc comment. */
  label?: string;
  /** Additional classes for the fixed viewport. */
  viewportClassName?: string;
  children: ReactNode;
}

export interface NotificationBannerContextValue {
  show: (options: NotificationBannerOptions) => string;
  dismiss: (id?: string) => void;
  store: NotificationBannerStore;
}

export const NotificationBannerContext = createContext<NotificationBannerContextValue | null>(null);

function resolveDuration(record: NotificationBannerRecord, fallback: number): number {
  if (record.priority === "high") return Infinity;
  if (record.duration !== undefined) return record.duration;
  return fallback;
}

/**
 * Renders one banner. A thin wrapper around `NotificationCard` rather than a
 * reimplementation: this component owns only the Radix `Root` (open state,
 * duration, swipe, foreground/background type) and always wires `onDismiss`
 * so the card renders its `×`, exactly like the toast/card contract already
 * documents ("Banner only").
 */
function BannerItem({
  record,
  duration,
  onRemove,
}: {
  record: NotificationBannerRecord;
  duration: number;
  onRemove: (id: string) => void;
}): ReactElement {
  const resolvedDuration = resolveDuration(record, duration);
  const timed = Number.isFinite(resolvedDuration) && resolvedDuration > 0;
  const { id, duration: _duration, open: _open, seq: _seq, ...cardProps } = record;
  void _duration;
  void _open;
  void _seq;

  return (
    <ToastPrimitive.Root
      open={record.open}
      onOpenChange={(open) => {
        if (!open) onRemove(id);
      }}
      duration={timed ? resolvedDuration : Infinity}
      // `foreground` interrupts a screen reader mid-sentence to announce the
      // event now — earned only by `priority="high"`. `normal` is
      // `background`, queued politely behind whatever is already being read.
      type={record.priority === "high" ? "foreground" : "background"}
      data-priority={record.priority}
      data-testid={`notification-banner-${id}`}
      className={cn(
        "pointer-events-auto w-full list-none",
        "transition-[opacity,transform] duration-200 ease-out starting:-translate-y-2 starting:opacity-0",
        "motion-reduce:transition-none motion-reduce:starting:translate-y-0",
        // Radix reports an "up" swipe through the *y* transform vars (this
        // provider is configured `swipeDirection="up"`); "cancel" snaps back,
        // "end" carries the dismiss the rest of the way off-screen.
        "data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=move]:transition-none",
        "data-[swipe=cancel]:translate-y-0",
        "data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)] data-[swipe=end]:opacity-0",
        "data-[state=closed]:opacity-0",
      )}
    >
      {/*
        NotificationCard's `density="card"` already draws the border/radius/
        padding; it renders no background of its own (its row density relies
        on a container — the panel's popover/sheet — to paint one). A banner
        floats over arbitrary page content, so this wrapper is the one place
        that owns the background and the "genuinely floats above the page"
        shadow, matching ToastItem's offset+blur shadow rather than a flat
        halo.
      */}
      <div className="w-full overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.28),0_2px_6px_-2px_rgba(0,0,0,0.12)]">
        <NotificationCard
          {...cardProps}
          density="card"
          onDismiss={() => {
            record.onDismiss?.();
            onRemove(id);
          }}
        />
      </div>
    </ToastPrimitive.Root>
  );
}

/**
 * The arrival surface for a high-value event — one at a time, at the top of
 * the screen — as opposed to `NotificationPanel`, which is the inbox someone
 * opens on their own. `NotificationBanner` is the moment the event *lands*;
 * `NotificationPanel` is where it lives afterward. Both render the same
 * `NotificationCard` (here at `density="card"`) so the two surfaces never
 * disagree about what a notification looks like.
 *
 * **Anchored at the top, deliberately, and not configurable to a corner**:
 * on a phone the `Toast` stack already owns the bottom edge, and an
 * `ActionButton` FAB also owns the bottom (`placement="corner"`). Anchoring
 * arrivals at the top means no overlap contract has to exist between the
 * three surfaces — they simply never occupy the same space. Putting the
 * banner at the bottom too would resurrect exactly the coordination problem
 * `ToastProvider`'s FAB-column reservation exists to solve, for a surface
 * that doesn't need to share the shelf in the first place.
 *
 * **The two-provider hazard**: this mounts a *second*
 * `ToastPrimitive.Provider`, independent of any `ToastProvider` elsewhere in
 * the tree (own store, own React context — never shares one). Two Radix
 * Toast providers means two live regions *and* two default F8 hotkeys
 * fighting to focus their viewport. Radix binds that hotkey on
 * `ToastPrimitive.Viewport` via its `hotkey` prop (default `["F8"]`); this
 * viewport is given `hotkey={[]}` so **F8 continues to reach the toast
 * viewport only**, plus its own distinct `label` so the two live regions
 * announce themselves differently. `useNotificationBanner()` never touches
 * `useToast()`'s context and vice versa — mounting both around the same app
 * is the supported, expected shape.
 *
 * **z-index**: the toast viewport sits at `z-[100]`, overlay primitives
 * (Dialog/Sheet/Popover) at `z-50`. This viewport also uses `z-[100]`: a
 * high-priority arrival must still be visible over a modal, and because this
 * host is pinned to the *top* edge while the toast stack is pinned to the
 * *bottom*, the two never physically occupy the same pixels — sharing the
 * top layer is safe, not a collision waiting to happen.
 */
export const NotificationBannerHost = ({
  children,
  position = "top",
  max = 1,
  duration = 8000,
  label = "Notification arrivals",
  viewportClassName,
}: NotificationBannerHostProps): ReactElement => {
  const [store] = useState(() => new NotificationBannerStore(max));
  const [records, setRecords] = useState<NotificationBannerRecord[]>(() => store.getSnapshot());

  useEffect(() => store.subscribe(setRecords), [store]);

  const show = useCallback((options: NotificationBannerOptions) => store.show(options), [store]);
  const dismiss = useCallback((id?: string) => store.dismiss(id), [store]);
  const remove = useCallback((id: string) => store.remove(id), [store]);

  const value = useMemo<NotificationBannerContextValue>(
    () => ({ show, dismiss, store }),
    [show, dismiss, store],
  );

  const ordered = [...records].sort((a, b) => a.seq - b.seq);
  const isTop = position === "top";

  return (
    <NotificationBannerContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="up" duration={duration} label={label}>
        {children}
        {ordered.map((record) => (
          <BannerItem key={record.id} record={record} duration={duration} onRemove={remove} />
        ))}
        <ToastPrimitive.Viewport
          hotkey={[]}
          label={label}
          data-testid="notification-banner-viewport"
          className={cn(
            "fixed inset-x-0 z-[100] m-0 flex max-h-screen w-full list-none flex-col gap-2 p-3 outline-none",
            isTop
              ? cn("top-0", "pt-[max(0.75rem,env(safe-area-inset-top))]")
              : cn("bottom-0", "pb-[max(0.75rem,env(safe-area-inset-bottom))]"),
            "sm:inset-x-auto sm:right-4 sm:w-[380px] sm:max-w-[calc(100vw-2rem)] sm:p-0",
            isTop ? "sm:top-4 sm:pt-0" : "sm:bottom-4 sm:pb-0",
            viewportClassName,
          )}
        />
      </ToastPrimitive.Provider>
    </NotificationBannerContext.Provider>
  );
};

export function useNotificationBannerContext(): NotificationBannerContextValue {
  const ctx = useContext(NotificationBannerContext);
  if (!ctx) {
    throw new Error(
      "useNotificationBanner() must be used inside a <NotificationBannerHost>. Mount one once near the app root.",
    );
  }
  return ctx;
}

export interface NotificationBannerApi {
  /** Shows a banner and returns its id (for a later `dismiss`). */
  show: (options: NotificationBannerOptions) => string;
  /** Closes one banner by id, or all of them. */
  dismiss: (id?: string) => void;
}

/**
 * Imperative banner API, mirroring `useToast()`.
 *
 * ```tsx
 * const { show, dismiss } = useNotificationBanner();
 * show({ title: "New comment from Maria", source: "person", actor: { name: "Maria Keller" }, timestamp: new Date() });
 * show({ title: "Approval required", priority: "high", timestamp: new Date(), actions: [{ label: "Review", onClick: openReview }] });
 * ```
 */
export function useNotificationBanner(): NotificationBannerApi {
  const ctx = useNotificationBannerContext();
  return useMemo(() => ({ show: ctx.show, dismiss: ctx.dismiss }), [ctx]);
}
