import type { NotificationCardProps } from "./NotificationCard";

/**
 * Everything `NotificationCard` needs, minus the two fields the banner host
 * owns itself: `density` is always `"card"` here, and `onDismiss` is wired
 * internally so the `×` always closes through the store (a caller-supplied
 * `onDismiss` below still runs first, as a "the user dismissed this" signal).
 */
export interface NotificationBannerOptions extends Omit<NotificationCardProps, "density"> {
  /**
   * Stable id. Passing the same id again updates the existing banner in
   * place instead of stacking a second one, mirroring `ToastOptions.id`.
   */
  id?: string;
  /**
   * Auto-dismiss delay in ms for `priority="normal"` banners. Defaults to
   * the host's `duration` (8000ms). Ignored for `priority="high"`, which
   * never auto-dismisses regardless of what is passed here.
   */
  duration?: number;
}

export interface NotificationBannerRecord extends NotificationBannerOptions {
  id: string;
  /** Set to `false` to start Radix's close transition; the record is removed once it finishes. */
  open: boolean;
  /** Monotonic insertion order, so the viewport can render oldest-to-newest deterministically. */
  seq: number;
}

type Listener = (records: NotificationBannerRecord[]) => void;

let seqCounter = 0;
let idCounter = 0;

/**
 * Tiny external store, same shape as `ToastStore` and for the same reason:
 * `show()` must be callable from anywhere (a websocket push, a polling
 * loop, a route loader) without a hook in scope, and `useSyncExternalStore`
 * in the host keeps React in sync with it. One instance per
 * `NotificationBannerHost`, so tests and nested apps stay isolated from each
 * other and from any `ToastStore` in the same tree.
 */
export class NotificationBannerStore {
  private records: NotificationBannerRecord[] = [];
  private readonly listeners = new Set<Listener>();
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): NotificationBannerRecord[] => this.records;

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.records);
    }
  }

  show(options: NotificationBannerOptions): string {
    const id = options.id ?? `notification-banner-${++idCounter}`;
    const existing = this.records.find((r) => r.id === id);
    if (existing) {
      this.records = this.records.map((r) =>
        r.id === id ? { ...r, ...options, id, priority: options.priority ?? r.priority, open: true } : r,
      );
      this.emit();
      return id;
    }

    const record: NotificationBannerRecord = {
      ...options,
      id,
      priority: options.priority ?? "normal",
      open: true,
      seq: ++seqCounter,
    };
    const next = [...this.records, record];
    // Over the cap: retire the oldest *open, non-high* banners first — a
    // high-priority arrival is never silently evicted by a flood of normal
    // ones, only ever closed on purpose (dismiss, swipe, Escape).
    const open = next.filter((r) => r.open);
    let overflow = open.length - this.max;
    this.records = next.map((r) => {
      if (overflow > 0 && r.open && r.priority !== "high" && r.id !== id) {
        overflow -= 1;
        return { ...r, open: false };
      }
      return r;
    });
    this.emit();
    return id;
  }

  /** Starts closing one banner, or every banner when `id` is omitted. */
  dismiss(id?: string): void {
    let changed = false;
    this.records = this.records.map((r) => {
      if ((id === undefined || r.id === id) && r.open) {
        changed = true;
        return { ...r, open: false };
      }
      return r;
    });
    if (changed) this.emit();
  }

  /** Removes the record for good — called once Radix's close transition has ended. */
  remove(id: string): void {
    const before = this.records.length;
    this.records = this.records.filter((r) => r.id !== id);
    if (this.records.length !== before) this.emit();
  }
}
