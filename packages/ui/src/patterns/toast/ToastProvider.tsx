import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { type ToastOptions, type ToastRecord, ToastStore, type ToastVariant } from "./toast-store";

/** Where the stack anchors from the `sm` breakpoint up. Below `sm` every position renders as a bottom stack, thumb-reachable and clear of the on-screen keyboard's usual focus. */
export type ToastPosition = "top-right" | "top-center" | "bottom-right" | "bottom-center";

export interface ToastProviderProps {
  children: ReactNode;
  /** @default "bottom-right" */
  position?: ToastPosition;
  /** Default auto-dismiss delay in ms for toasts that don't set their own. @default 5000 */
  duration?: number;
  /** How many toasts stay visible at once; the oldest non-error ones retire first. @default 3 */
  max?: number;
  /**
   * Accessible name of the notification region, also announced with the
   * F8 hotkey Radix binds to focus it. Use `{hotkey}` as a placeholder.
   * @default "Notifications ({hotkey})"
   */
  label?: string;
  /** Additional classes for the fixed viewport (e.g. to clear a bottom tab bar with `pb-20`). */
  viewportClassName?: string;
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  update: (id: string, patch: Partial<Omit<ToastOptions, "id">>) => void;
  dismiss: (id?: string) => void;
  store: ToastStore;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, ReactElement | null> = {
  success: <CheckCircle2 className="size-5" aria-hidden="true" />,
  error: <AlertCircle className="size-5" aria-hidden="true" />,
  warning: <AlertTriangle className="size-5" aria-hidden="true" />,
  info: <Info className="size-5" aria-hidden="true" />,
  loading: <Loader2 className="size-5 animate-spin" aria-hidden="true" />,
  neutral: null,
};

/**
 * Same fixed-palette reasoning as AlertBox/StatusBadge: the shared theme has
 * no success/warning/info tokens, so those three use Tailwind shades with
 * `dark:` variants; error/neutral reuse `destructive`/`primary`.
 */
const VARIANT_ICON_CLASS: Record<ToastVariant, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-sky-600 dark:text-sky-400",
  loading: "text-muted-foreground",
  neutral: "text-foreground",
};

const VARIANT_BAR_CLASS: Record<ToastVariant, string> = {
  success: "bg-emerald-500",
  error: "bg-destructive",
  warning: "bg-amber-500",
  info: "bg-sky-500",
  loading: "bg-muted-foreground",
  neutral: "bg-primary",
};

const POSITION_CLASS: Record<ToastPosition, string> = {
  "top-right": "sm:top-4 sm:bottom-auto sm:right-4 sm:left-auto sm:flex-col-reverse",
  "top-center": "sm:top-4 sm:bottom-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:flex-col-reverse",
  "bottom-right": "sm:right-4 sm:left-auto",
  "bottom-center": "sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
};

function resolveDuration(record: ToastRecord, fallback: number): number {
  if (record.duration !== undefined) return record.duration;
  if (record.variant === "error" || record.variant === "loading") return Infinity;
  return fallback;
}

/**
 * Renders one toast. Kept a separate component so each toast owns its
 * progress-bar animation instance (paused/resumed by Radix's hover/focus/
 * window-blur pause events, which CCMT2's hand-rolled version only got
 * half-right with mouseenter/mouseleave).
 */
function ToastItem({
  record,
  duration,
  onRemove,
}: {
  record: ToastRecord;
  duration: number;
  onRemove: (id: string) => void;
}): ReactElement {
  const barRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const resolvedDuration = resolveDuration(record, duration);
  const timed = Number.isFinite(resolvedDuration) && resolvedDuration > 0;

  useEffect(() => {
    const bar = barRef.current;
    animationRef.current?.cancel();
    animationRef.current = null;
    if (!bar || !timed || typeof bar.animate !== "function") return;
    // Web Animations API rather than a stylesheet: this package ships no CSS
    // file, and the bar must restart whenever the toast is updated in place
    // (e.g. "Saving…" -> "Saved") — the effect re-runs on `record.seq`/title.
    animationRef.current = bar.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
      duration: resolvedDuration,
      easing: "linear",
      fill: "forwards",
    });
    return () => {
      animationRef.current?.cancel();
    };
  }, [timed, resolvedDuration, record.title, record.description, record.variant]);

  // A toast closed through the store (`dismiss()`, eviction over `max`) never
  // round-trips through Radix's onOpenChange, so retire its record here once
  // the 200ms fade has run. Radix-initiated closes (timer, swipe, ×) call
  // onRemove directly via onOpenChange below.
  useEffect(() => {
    if (record.open) return;
    const timer = setTimeout(() => onRemove(record.id), 220);
    return () => clearTimeout(timer);
  }, [record.open, record.id, onRemove]);

  const icon = record.icon === undefined ? VARIANT_ICON[record.variant] : record.icon;
  const dismissible = record.dismissible !== false || record.variant === "error";
  const isError = record.variant === "error";

  return (
    <ToastPrimitive.Root
      open={record.open}
      onOpenChange={(open) => {
        if (!open) onRemove(record.id);
      }}
      duration={timed ? resolvedDuration : Infinity}
      type={isError || record.variant === "warning" ? "foreground" : "background"}
      onPause={() => animationRef.current?.pause()}
      onResume={() => animationRef.current?.play()}
      data-variant={record.variant}
      data-testid={`toast-${record.id}`}
      className={cn(
        "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-border bg-popover p-3 pr-2 text-popover-foreground",
        // A toast genuinely floats above the page, so it earns the one real
        // shadow in the system: offset + soft blur, never a flat halo.
        "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.28),0_2px_6px_-2px_rgba(0,0,0,0.12)]",
        "transition-[opacity,transform] duration-200 ease-out starting:translate-y-2 starting:opacity-0",
        "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
        "data-[swipe=cancel]:translate-x-0",
        "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:opacity-0",
        "data-[state=closed]:opacity-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {icon != null && <span className={cn("mt-0.5 shrink-0", VARIANT_ICON_CLASS[record.variant])}>{icon}</span>}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
        <ToastPrimitive.Title className="text-sm font-semibold leading-5 text-foreground [overflow-wrap:anywhere]">
          {record.title}
        </ToastPrimitive.Title>
        {record.description != null && (
          <ToastPrimitive.Description className="text-[13px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            {record.description}
          </ToastPrimitive.Description>
        )}
        {record.action && (
          <ToastPrimitive.Action asChild altText={record.action.altText ?? record.action.label}>
            <Button
              variant="outline"
              size="sm"
              className="mt-1.5 h-8 w-fit min-h-8 px-3 text-xs font-semibold sm:h-7 sm:min-h-7"
              onClick={record.action.onClick}
            >
              {record.action.label}
            </Button>
          </ToastPrimitive.Action>
        )}
      </div>
      {dismissible && (
        <ToastPrimitive.Close asChild>
          <button
            type="button"
            aria-label="Dismiss"
            className={cn(
              // 40px tap target on touch, tightens to 28px from `sm` where a
              // pointer is precise and the stack is narrower.
              "-my-1 flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "sm:-my-0.5 sm:size-7",
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </ToastPrimitive.Close>
      )}
      {timed && (
        <div
          ref={barRef}
          aria-hidden="true"
          className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-70", VARIANT_BAR_CLASS[record.variant])}
        />
      )}
    </ToastPrimitive.Root>
  );
}

/**
 * Mounts the notification stack and exposes `useToast()` to everything
 * inside. Place it once, near the app root, *outside* any element that
 * re-mounts on navigation, so toasts survive route changes.
 *
 * Replaces the hand-rolled notification services surveyed in consuming apps
 * (a fixed `alert` container with a shrinking time bar, mouseenter pause and
 * an action row) with one that is also correct for screen readers (a
 * polite/assertive live region, F8 to reach the stack), keyboard (Escape
 * dismisses the focused toast) and touch (swipe to dismiss).
 */
export const ToastProvider = ({
  children,
  position = "bottom-right",
  duration = 5000,
  max = 3,
  label,
  viewportClassName,
}: ToastProviderProps): ReactElement => {
  const [store] = useState(() => new ToastStore(max));
  const [toasts, setToasts] = useState<ToastRecord[]>(() => store.getSnapshot());

  useEffect(() => store.subscribe(setToasts), [store]);

  const toast = useCallback((options: ToastOptions) => store.add(options), [store]);
  const update = useCallback(
    (id: string, patch: Partial<Omit<ToastOptions, "id">>) => store.update(id, patch),
    [store],
  );
  const dismiss = useCallback((id?: string) => store.dismiss(id), [store]);
  const remove = useCallback((id: string) => store.remove(id), [store]);

  const value = useMemo<ToastContextValue>(() => ({ toast, update, dismiss, store }), [toast, update, dismiss, store]);

  // Newest at the thumb end on a phone (bottom); the flex-direction flips per
  // POSITION_CLASS so "newest nearest the anchor edge" holds everywhere.
  const ordered = [...toasts].sort((a, b) => a.seq - b.seq);
  const isTop = position.startsWith("top");

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={duration} label={label}>
        {children}
        {ordered.map((record) => (
          <ToastItem key={record.id} record={record} duration={duration} onRemove={remove} />
        ))}
        <ToastPrimitive.Viewport
          data-testid="toast-viewport"
          className={cn(
            "fixed inset-x-0 bottom-0 z-[100] m-0 flex max-h-screen w-full list-none flex-col gap-2 p-4 outline-none",
            // Keep clear of the home indicator / bottom tab bars on phones.
            // `--ui-bottom-inset` is the cross-pattern contract (see
            // ActionButton/ActionSheet): a consumer sets it once on <body>
            // (e.g. `calc(72px + env(safe-area-inset-bottom))` for a 72px tab
            // bar) instead of passing a one-off `viewportClassName="pb-20"`.
            // Falls back to the safe-area inset alone when unset, so this is
            // pure back-compat for consumers that never set the variable.
            "pb-[max(1rem,calc(var(--ui-bottom-inset,env(safe-area-inset-bottom,0px))+0.5rem))]",
            "sm:inset-x-auto sm:w-[380px] sm:max-w-[calc(100vw-2rem)] sm:p-0 sm:pb-0",
            isTop ? "sm:pt-0" : "sm:bottom-4",
            // FAB column reservation: an ActionButton with placement="corner"
            // sets data-ui-fab="left"|"right" on <html> for as long as it's
            // mounted (see ActionButton.tsx). Reading it here with a plain CSS
            // attribute selector — rather than a MutationObserver/context —
            // keeps the two patterns decoupled: neither needs to know the
            // other exists. Tailwind v4 supports the `&`-relative arbitrary
            // variant used below, so this needed no JS fallback.
            "[html[data-ui-fab=right]_&]:pr-[4.5rem] [html[data-ui-fab=left]_&]:pl-[4.5rem]",
            "sm:[html[data-ui-fab=right]_&]:max-w-[calc(100vw-5.5rem)] sm:[html[data-ui-fab=left]_&]:max-w-[calc(100vw-5.5rem)]",
            POSITION_CLASS[position],
            viewportClassName,
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used inside a <ToastProvider>. Mount one once near the app root.");
  }
  return ctx;
}
