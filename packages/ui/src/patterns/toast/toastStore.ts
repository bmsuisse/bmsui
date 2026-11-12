// Module-level toast queue, read by <Toaster> via useSyncExternalStore. No
// zustand or context needed: call `toast(...)` from anywhere (query error
// handlers, mutations, stores). Ported from OneDocs' toastStore/Toaster.

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /**
   * Dedupe key. Showing a toast whose `id` matches one that is still visible replaces that toast in place
   * (new text, fresh countdown) instead of stacking a second one, e.g. for an error that fires on every retry.
   * `toast.dismiss(id)` also accepts it.
   */
  id?: string;
  /** Short secondary line under the message. */
  description?: string;
  tone?: ToastTone;
  /** One inline button, e.g. "Undo". Clicking it also dismisses the toast. */
  action?: ToastAction;
  /** Milliseconds before it hides. Falls back to the `<Toaster duration>` default (4000; errors 8000). `Infinity` keeps it until dismissed. */
  duration?: number;
}

export interface ToastItem {
  id: number;
  /** The caller's dedupe key, see `ToastOptions.id`. */
  key?: string;
  message: string;
  description?: string;
  tone: ToastTone;
  action?: ToastAction;
  /** Set only when the caller passed one; otherwise `<Toaster>` resolves it from its own default. */
  duration?: number;
  /** Dismissed and playing its exit transition before removal. */
  leaving: boolean;
}

/** Used when neither the toast nor `<Toaster duration>` sets one. */
export const DEFAULT_TOAST_DURATION: Record<ToastTone, number> = { info: 4000, success: 4000, warning: 4000, error: 8000 };

/** Toasts kept at once; showing a 4th drops the oldest. */
export const MAX_TOASTS = 3;
/** Matches the exit transition in Toaster.tsx. */
export const TOAST_EXIT_MS = 150;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = (next: ToastItem[]) => {
  toasts = next;
  for (const l of listeners) l();
};

export const subscribeToasts = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getToasts = (): ToastItem[] => toasts;

const EMPTY: ToastItem[] = [];
/** Server render and hydration see no toasts; a module-level queue would leak across requests and mismatch on hydrate. */
export const getServerToasts = (): ToastItem[] => EMPTY;

const remove = (id: number) => emit(toasts.filter((t) => t.id !== id));

/** Starts the exit transition of one toast (by the number `toast()` returned or by its `id` option), or of every toast when `id` is omitted. */
export function dismissToast(id?: number | string): void {
  const targets = toasts.filter((t) => !t.leaving && (id === undefined || t.id === id || t.key === id));
  if (targets.length === 0) return;
  const ids = new Set(targets.map((t) => t.id));
  emit(toasts.map((t) => (ids.has(t.id) ? { ...t, leaving: true } : t)));
  setTimeout(() => {
    for (const i of ids) remove(i);
  }, TOAST_EXIT_MS);
}

function show(message: string, options: ToastOptions = {}): number {
  const id = nextId++;
  const tone = options.tone ?? "info";
  const item: ToastItem = {
    id,
    key: options.id,
    message,
    description: options.description,
    tone,
    action: options.action,
    duration: options.duration,
    leaving: false,
  };
  const active = toasts.filter((t) => !t.leaving);
  const same = options.id === undefined ? undefined : active.find((t) => t.key === options.id);
  if (same) {
    emit(toasts.map((t) => (t === same ? item : t)));
    return id;
  }
  if (active.length >= MAX_TOASTS) {
    // Make room by dropping the oldest timed toast; sticky ones (`Infinity`) go only when nothing else can.
    const victim = active.find((t) => t.duration !== Infinity) ?? active[0];
    if (victim) dismissToast(victim.id);
  }
  emit([...toasts, item]);
  return id;
}

type ToneOptions = Omit<ToastOptions, "tone">;

/**
 * Show a brief, non-blocking notice. Needs one `<Toaster />` mounted in the app;
 * the countdown runs in the rendered toast, so a toast queued while no Toaster
 * is mounted waits until one is.
 * Returns the toast id for `toast.dismiss(id)`.
 */
export const toast = Object.assign(show, {
  info: (message: string, options?: ToneOptions) => show(message, { ...options, tone: "info" }),
  success: (message: string, options?: ToneOptions) => show(message, { ...options, tone: "success" }),
  warning: (message: string, options?: ToneOptions) => show(message, { ...options, tone: "warning" }),
  error: (message: string, options?: ToneOptions) => show(message, { ...options, tone: "error" }),
  dismiss: dismissToast,
});

/** Test helper: drop every toast immediately. */
export function resetToasts(): void {
  emit([]);
}
