import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { type ComponentType, type ReactElement, type SVGProps, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/utils";
import { dismissToast, getServerToasts, getToasts, subscribeToasts, type ToastItem, type ToastTone } from "./toastStore";

export type ToasterPosition = "bottom-center" | "bottom-right" | "top-center" | "top-right";

export interface ToasterLabels {
  /** Accessible name of the toast region. */
  region: string;
  dismiss: string;
}

export const defaultToasterLabels: ToasterLabels = {
  region: "Notifications",
  dismiss: "Dismiss",
};

export interface ToasterProps {
  position?: ToasterPosition;
  labels?: Partial<ToasterLabels>;
  className?: string;
}

const positionClass: Record<ToasterPosition, string> = {
  "bottom-center": "bottom-4 items-center pb-[env(safe-area-inset-bottom)]",
  "bottom-right": "bottom-4 items-end pb-[env(safe-area-inset-bottom)]",
  "top-center": "top-4 items-center pt-[env(safe-area-inset-top)]",
  "top-right": "top-4 items-end pt-[env(safe-area-inset-top)]",
};

const toneIcon: Record<ToastTone, ComponentType<SVGProps<SVGSVGElement>>> = {
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
};

const toneIconClass: Record<ToastTone, string> = {
  info: "text-sky-600 dark:text-sky-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-destructive",
};

/**
 * Renders the toasts queued with `toast(...)`. Mount once near the app root.
 * Each toast fades in, shows the time it has left as a thin bar, pauses while
 * hovered or focused, and fades out on dismiss. No CSS or animation plugin needed.
 */
export const Toaster = ({ position = "bottom-center", labels, className }: ToasterProps): ReactElement => {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  const l = { ...defaultToasterLabels, ...labels };
  const top = position.startsWith("top");
  return (
    <section
      aria-label={l.region}
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[100] flex gap-2 px-4",
        top ? "flex-col-reverse" : "flex-col",
        positionClass[position],
        className,
      )}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} dismissLabel={l.dismiss} />
      ))}
    </section>
  );
};

const ToastCard = ({ toast, dismissLabel }: { toast: ToastItem; dismissLabel: string }): ReactElement => {
  const [entered, setEntered] = useState(false);
  // Hover and focus pause independently: leaving with the mouse must not resume while a button inside has focus.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const bar = useRef<HTMLSpanElement>(null);
  const Icon = toneIcon[toast.tone];
  const timed = Number.isFinite(toast.duration) && toast.duration > 0;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // The countdown: the progress bar's animation drives the dismissal where the
  // Web Animations API exists; a pausable timeout stands in elsewhere (jsdom).
  const remaining = useRef(toast.duration);
  const animRef = useRef<Animation | null>(null);
  useEffect(() => {
    if (!timed || toast.leaving) return;
    const el = bar.current;
    if (el && typeof el.animate === "function") {
      const anim = el.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
        duration: toast.duration,
        fill: "forwards",
      });
      anim.onfinish = () => dismissToast(toast.id);
      animRef.current = anim;
      return () => {
        anim.onfinish = null;
        anim.cancel();
        animRef.current = null;
      };
    }
    return undefined;
  }, [timed, toast.duration, toast.id, toast.leaving]);

  useEffect(() => {
    if (!timed || toast.leaving) return;
    if (animRef.current) {
      if (paused) animRef.current.pause();
      else animRef.current.play();
      return;
    }
    if (paused) return;
    const started = Date.now();
    const handle = setTimeout(() => dismissToast(toast.id), remaining.current);
    return () => {
      clearTimeout(handle);
      remaining.current -= Date.now() - started;
    };
  }, [paused, timed, toast.id, toast.leaving]);

  const shown = entered && !toast.leaving;
  return (
    <div
      role={toast.tone === "error" ? "alert" : undefined}
      data-testid="toast"
      data-tone={toast.tone}
      data-state={toast.leaving ? "closed" : "open"}
      onPointerEnter={(e) => {
        // A touch tap fires enter without a matching leave; only a real mouse hover pauses.
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className={cn(
        "pointer-events-auto relative flex w-full max-w-sm items-start gap-2 overflow-hidden rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-card-foreground shadow-lg transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        toast.leaving && "pointer-events-none",
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", toneIconClass[toast.tone])} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{toast.message}</p>
        {toast.description ? <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p> : null}
      </div>
      {toast.action ? (
        <button
          type="button"
          data-testid="toast-action"
          onClick={() => {
            if (toast.leaving) return;
            toast.action?.onClick();
            dismissToast(toast.id);
          }}
          className="shrink-0 rounded-sm px-1.5 py-0.5 font-semibold text-foreground underline-offset-2 hover:bg-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={() => dismissToast(toast.id)}
        className="grid h-5 w-5 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XMarkIcon aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      {timed && !toast.leaving ? (
        <span
          ref={bar}
          aria-hidden="true"
          data-testid="toast-progress"
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-foreground/25 motion-reduce:opacity-0"
        />
      ) : null}
    </div>
  );
};
