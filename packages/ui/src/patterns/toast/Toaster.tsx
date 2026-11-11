import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { type ComponentType, type ReactElement, type SVGProps, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/utils";
import { DEFAULT_TOAST_DURATION, dismissToast, getServerToasts, getToasts, subscribeToasts, type ToastItem, type ToastTone } from "./toastStore";

export type ToasterPosition =
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "top-left"
  | "top-right";

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
  /** Where the stack sits. Defaults to `bottom-center`. */
  position?: ToasterPosition;
  /** Default lifetime in ms for toasts that don't pass their own `duration`: one number for all tones, or per tone
   * (`{ error: 12000 }`; missing tones keep their default of 4000, errors 8000). `Infinity` keeps toasts until dismissed. */
  duration?: number | Partial<Record<ToastTone, number>>;
  labels?: Partial<ToasterLabels>;
  className?: string;
  /**
   * Slide in from the toaster's edge with a slight scale, fade + shrink out, and let
   * the stack close the gap smoothly. `false` shows and removes toasts instantly.
   * Under `prefers-reduced-motion` only the fade remains. @default true
   */
  animated?: boolean;
}

const positionClass: Record<ToasterPosition, string> = {
  "bottom-center": "bottom-3 items-center pb-[env(safe-area-inset-bottom)]",
  "bottom-left": "bottom-3 items-start pb-[env(safe-area-inset-bottom)]",
  "bottom-right": "bottom-3 items-end pb-[env(safe-area-inset-bottom)]",
  "top-center": "top-3 items-center pt-[env(safe-area-inset-top)]",
  "top-left": "top-3 items-start pt-[env(safe-area-inset-top)]",
  "top-right": "top-3 items-end pt-[env(safe-area-inset-top)]",
};

/** Enter duration; exit is the store's `TOAST_EXIT_MS` (150ms). */
const ENTER_MS = 200;

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
  error: "text-red-600 dark:text-red-400",
};

/**
 * Renders the toasts queued with `toast(...)`. Mount once near the app root.
 * Each toast fades in, shows the time it has left as a thin bar, pauses while
 * hovered or focused, and fades out on dismiss. No CSS or animation plugin needed.
 */
export const Toaster = ({ position = "bottom-center", duration, labels, className, animated = true }: ToasterProps): ReactElement => {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  const l = { ...defaultToasterLabels, ...labels };
  const top = position.startsWith("top");
  return (
    <section
      aria-label={l.region}
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[100] flex px-4",
        top ? "flex-col-reverse" : "flex-col",
        positionClass[position],
        className,
      )}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} duration={resolveDuration(t, duration)} dismissLabel={l.dismiss} fromTop={top} animated={animated} />
      ))}
    </section>
  );
};

const resolveDuration = (t: ToastItem, fallback: ToasterProps["duration"]): number =>
  t.duration ?? (typeof fallback === "number" ? fallback : (fallback?.[t.tone] ?? DEFAULT_TOAST_DURATION[t.tone]));

const ToastCard = ({
  toast,
  duration,
  dismissLabel,
  fromTop,
  animated,
}: {
  toast: ToastItem;
  /** Already resolved from the toast's own `duration` or the Toaster default. */
  duration: number;
  dismissLabel: string;
  fromTop: boolean;
  animated: boolean;
}): ReactElement => {
  const [entered, setEntered] = useState(false);
  // The row clips its card only while its height animates (enter/exit), so the
  // card's shadow isn't cut off while it sits still.
  const [settled, setSettled] = useState(false);
  // Hover and focus pause independently: leaving with the mouse must not resume while a button inside has focus.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const bar = useRef<HTMLSpanElement>(null);
  const Icon = toneIcon[toast.tone];
  const timed = Number.isFinite(duration) && duration > 0;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    const handle = setTimeout(() => setSettled(true), ENTER_MS + 20);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(handle);
    };
  }, []);

  // The countdown: the progress bar's animation drives the dismissal where the
  // Web Animations API exists; a pausable timeout stands in elsewhere (jsdom).
  const remaining = useRef(duration);
  const animRef = useRef<Animation | null>(null);
  useEffect(() => {
    if (!timed || toast.leaving) return;
    const el = bar.current;
    if (el && typeof el.animate === "function") {
      const anim = el.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
        duration,
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
  }, [timed, duration, toast.id, toast.leaving]);

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
    // Each toast sits in a grid row that grows from 0fr to 1fr and back, so the
    // stack reflows smoothly when a toast arrives or leaves (no measuring). The
    // row's padding is the gap between toasts, so it collapses with it.
    <div
      data-testid="toast-row"
      className={cn(
        "grid w-full max-w-sm",
        animated && "transition-[grid-template-rows] motion-reduce:transition-none",
        shown || !animated ? "grid-rows-[1fr] duration-200 ease-out" : "grid-rows-[0fr] duration-150 ease-in",
      )}
    >
      <div className={cn("min-h-0", animated && (!settled || toast.leaving) && "overflow-hidden")}>
        <div className="py-1">
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
              // Popover surface, not `bg-card`: the shared theme has no --card token (see Card), so
              // bg-card rendered the toast transparent over the page. Hairline is 10% foreground in
              // light (--border is near-invisible on the light surface), the theme border in dark.
              "pointer-events-auto relative flex w-full items-start gap-2.5 overflow-hidden rounded-lg border border-foreground/10 bg-popover py-3 pl-3.5 pr-2.5 text-sm text-popover-foreground shadow-lg shadow-black/[0.08] dark:border-border dark:shadow-black/40",
              // Enter: 200ms ease-out from the toaster's edge (8px) at 97% scale. Exit: 150ms
              // ease-in fade + shrink in place. Reduced motion keeps only the opacity fade.
              animated &&
                "transition-[opacity,translate,scale] motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:transition-opacity",
              !animated
                ? "opacity-100"
                : shown
                  ? "translate-y-0 scale-100 opacity-100 duration-200 ease-out"
                  : cn(
                      "scale-[0.97] opacity-0",
                      toast.leaving ? "duration-150 ease-in" : fromTop ? "-translate-y-2" : "translate-y-2",
                    ),
              toast.leaving && "pointer-events-none",
            )}
          >
            <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", toneIconClass[toast.tone])} strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-5">{toast.message}</p>
              {toast.description ? (
                <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">{toast.description}</p>
              ) : null}
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
                className="-my-0.5 inline-flex h-6 shrink-0 items-center rounded-md border border-foreground/15 px-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label={dismissLabel}
              onClick={() => dismissToast(toast.id)}
              className="-my-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <XMarkIcon aria-hidden="true" className="h-4 w-4" />
            </button>
            {timed && !toast.leaving ? (
              <span
                ref={bar}
                aria-hidden="true"
                data-testid="toast-progress"
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-foreground/15 motion-reduce:opacity-0"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
