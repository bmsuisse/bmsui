import type { ReactNode } from "react";

/** Semantic intent of a toast; drives icon, accent colour and screen-reader urgency. */
export type ToastVariant = "success" | "error" | "warning" | "info" | "neutral" | "loading";

export interface ToastAction {
  /** Button text, e.g. `"Undo"`, `"Retry"`, `"Open"`. */
  label: string;
  onClick: () => void;
  /**
   * Screen-reader description of what the action does when the visible label
   * alone is too terse (Radix requires one for every toast action).
   * @default the `label`
   */
  altText?: string;
}

export interface ToastOptions {
  /**
   * Stable id. Passing the same id again updates the existing toast in place
   * instead of stacking a second one — how a "Saving…" toast becomes "Saved".
   */
  id?: string;
  /** One line. Keep it a sentence a rep can read in the second it's on screen. */
  title: ReactNode;
  /** Optional second line with the detail (what failed, how many rows, …). */
  description?: ReactNode;
  /** @default "neutral" */
  variant?: ToastVariant;
  /**
   * Auto-dismiss delay in ms. Defaults to the provider's `duration`
   * (5000ms), or `Infinity` for `error` and `loading` toasts, which stay
   * until dismissed or updated — an error that vanishes before it's read is
   * an error the user never saw.
   */
  duration?: number;
  /** A single follow-up action rendered as a button inside the toast. */
  action?: ToastAction;
  /**
   * Whether the close (×) button is shown. Errors keep it regardless.
   * @default true
   */
  dismissible?: boolean;
  /** Replaces the variant's default icon; `null` hides it. */
  icon?: ReactNode;
}

export interface ToastRecord extends ToastOptions {
  id: string;
  variant: ToastVariant;
  /** Set to `false` to start Radix's close transition; the record is removed once it finishes. */
  open: boolean;
  /** Monotonic insertion order, so the viewport can sort newest-first deterministically. */
  seq: number;
}

type Listener = (toasts: ToastRecord[]) => void;

let seqCounter = 0;
let idCounter = 0;

/**
 * A tiny external store (subscribe/getSnapshot, consumed via
 * `useSyncExternalStore`) rather than React state in the provider, so that
 * `toast()` can be called from anywhere — an async mutation callback, a
 * websocket handler, a router loader — without a hook in scope. Instantiated
 * per `ToastProvider`, so tests and nested apps stay isolated.
 */
export class ToastStore {
  private toasts: ToastRecord[] = [];
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

  getSnapshot = (): ToastRecord[] => this.toasts;

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.toasts);
    }
  }

  add(options: ToastOptions): string {
    const id = options.id ?? `toast-${++idCounter}`;
    const existing = this.toasts.find((t) => t.id === id);
    if (existing) {
      this.toasts = this.toasts.map((t) =>
        t.id === id ? { ...t, ...options, id, variant: options.variant ?? t.variant, open: true } : t,
      );
      this.emit();
      return id;
    }

    const record: ToastRecord = {
      ...options,
      id,
      variant: options.variant ?? "neutral",
      open: true,
      seq: ++seqCounter,
    };
    const next = [...this.toasts, record];
    // Over the cap: retire the oldest *open, non-error* toasts first. Errors
    // are never evicted by a flood of successes — they only leave on purpose.
    const open = next.filter((t) => t.open);
    let overflow = open.length - this.max;
    this.toasts = next.map((t) => {
      if (overflow > 0 && t.open && t.variant !== "error" && t.id !== id) {
        overflow -= 1;
        return { ...t, open: false };
      }
      return t;
    });
    this.emit();
    return id;
  }

  update(id: string, patch: Partial<Omit<ToastOptions, "id">>): void {
    if (!this.toasts.some((t) => t.id === id)) return;
    this.toasts = this.toasts.map((t) => (t.id === id ? { ...t, ...patch, open: true } : t));
    this.emit();
  }

  /** Starts closing one toast, or every toast when `id` is omitted. */
  dismiss(id?: string): void {
    let changed = false;
    this.toasts = this.toasts.map((t) => {
      if ((id === undefined || t.id === id) && t.open) {
        changed = true;
        return { ...t, open: false };
      }
      return t;
    });
    if (changed) this.emit();
  }

  /** Removes the record for good — called by the viewport once Radix's close transition has ended. */
  remove(id: string): void {
    const before = this.toasts.length;
    this.toasts = this.toasts.filter((t) => t.id !== id);
    if (this.toasts.length !== before) this.emit();
  }
}
