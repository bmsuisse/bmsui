import { type HTMLAttributes, type ReactElement, type ReactNode, useEffect, useId, useRef } from "react";
import { cn } from "../../lib/utils";

export type ProgressTone = "default" | "success" | "warning" | "error";

/**
 * Fill per tone. `default` is the brand color in light mode but `--ring` in
 * dark mode: some themes keep `--primary` a dark navy in dark mode, which
 * disappears on a dark surface, while `--ring` is tuned to be visible there.
 * The other tones use fixed palette shades (no success/warning tokens in the
 * theme), 500-level so they read on both surfaces.
 */
const FILL: Record<ProgressTone, string> = {
  default: "bg-primary dark:bg-ring",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};
const STROKE: Record<ProgressTone, string> = {
  default: "stroke-primary dark:stroke-ring",
  success: "stroke-emerald-500",
  warning: "stroke-amber-500",
  error: "stroke-red-500",
};

const HEIGHT = { sm: "h-1", md: "h-2", lg: "h-3" } as const;

function clampPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

const defaultFormat = (value: number, max: number): string => `${Math.round(clampPercent(value, max))}%`;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Current value, `0`..`max`. `null`/`undefined` = indeterminate (sliding bar, no value text). */
  value?: number | null;
  /** @default 100 */
  max?: number;
  /** Text above the bar, left. Also the bar's accessible name unless `aria-label` is given. */
  label?: ReactNode;
  /** Show the formatted value above the bar, right. @default true when `label` is set */
  showValue?: boolean;
  /** Formats the value text and `aria-valuetext`. @default percent, e.g. `"42%"` */
  formatValue?: (value: number, max: number) => string;
  /** @default "default" */
  tone?: ProgressTone;
  /** Bar height: `sm` 4px, `md` 8px (default), `lg` 12px. */
  size?: "sm" | "md" | "lg";
}

/**
 * Horizontal progress bar (`role="progressbar"`). Use it for a task with a
 * known end (upload, import, quota used) — pass `value` — or an unknown one
 * (omit `value`). For a short spinner-sized indicator use `CircularProgress`;
 * for a refetch hint at the top of a panel use `RefreshBar`.
 */
export const ProgressBar = ({
  value,
  max = 100,
  label,
  showValue,
  formatValue = defaultFormat,
  tone = "default",
  size = "md",
  className,
  "aria-label": ariaLabel,
  ...props
}: ProgressBarProps): ReactElement => {
  const indeterminate = value == null;
  const percent = indeterminate ? 0 : clampPercent(value, max);
  const valueText = indeterminate ? undefined : formatValue(value, max);
  const withValue = (showValue ?? label != null) && !indeterminate;
  const labelId = useId();
  const slider = useRef<HTMLDivElement>(null);

  // Indeterminate: slide a 40% segment across with the Web Animations API, so no keyframes CSS is needed.
  useEffect(() => {
    const el = slider.current;
    if (!indeterminate || !el || typeof el.animate !== "function" || prefersReducedMotion()) return;
    const anim = el.animate([{ transform: "translateX(-100%)" }, { transform: "translateX(250%)" }], {
      duration: 1400,
      iterations: Infinity,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
    });
    return () => anim.cancel();
  }, [indeterminate]);

  return (
    <div data-testid="progress-bar" className={cn("flex w-full flex-col gap-1.5", className)} {...props}>
      {label != null || withValue ? (
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span id={labelId} className="min-w-0 truncate font-medium text-foreground">
            {label}
          </span>
          {withValue ? <span className="shrink-0 tabular-nums text-muted-foreground">{valueText}</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-labelledby={label != null && !ariaLabel ? labelId : undefined}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : Math.min(max, Math.max(0, value))}
        aria-valuetext={valueText}
        aria-busy={indeterminate || undefined}
        data-state={indeterminate ? "indeterminate" : percent >= 100 ? "complete" : "loading"}
        className={cn("relative w-full overflow-hidden rounded-full bg-foreground/10", HEIGHT[size])}
      >
        {indeterminate ? (
          <div ref={slider} className={cn("h-full w-2/5 rounded-full motion-reduce:opacity-60", FILL[tone])} />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none",
              FILL[tone],
            )}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
};

export interface CircularProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** `0`..`max`; `null`/`undefined` = indeterminate (spinning arc). */
  value?: number | null;
  /** @default 100 */
  max?: number;
  /** Diameter in px. @default 32 */
  size?: number;
  /** Ring thickness in px. @default 3 */
  strokeWidth?: number;
  /** @default "default" */
  tone?: ProgressTone;
  /** Show the formatted value in the middle (only sensible from ~36px). @default false */
  showValue?: boolean;
  /** @default percent */
  formatValue?: (value: number, max: number) => string;
}

/**
 * Small ring progress (`role="progressbar"`) for tight spots: a card corner,
 * a list row, an upload thumbnail. Give it an `aria-label`. For a full-width
 * bar with a label use `ProgressBar`.
 */
export const CircularProgress = ({
  value,
  max = 100,
  size = 32,
  strokeWidth = 3,
  tone = "default",
  showValue = false,
  formatValue = defaultFormat,
  className,
  style,
  ...props
}: CircularProgressProps): ReactElement => {
  const indeterminate = value == null;
  const percent = indeterminate ? 25 : clampPercent(value, max);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const valueText = indeterminate ? undefined : formatValue(value, max);
  return (
    <div
      role="progressbar"
      data-testid="circular-progress"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : Math.min(max, Math.max(0, value))}
      aria-valuetext={valueText}
      aria-busy={indeterminate || undefined}
      data-state={indeterminate ? "indeterminate" : percent >= 100 ? "complete" : "loading"}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn("-rotate-90", indeterminate && "animate-spin motion-reduce:animate-none")}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth} className="stroke-foreground/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className={cn("transition-[stroke-dashoffset,stroke] duration-300 ease-out motion-reduce:transition-none", STROKE[tone])}
        />
      </svg>
      {showValue && valueText ? (
        <span className="absolute text-[10px] font-medium tabular-nums text-foreground">{valueText}</span>
      ) : null}
    </div>
  );
};
