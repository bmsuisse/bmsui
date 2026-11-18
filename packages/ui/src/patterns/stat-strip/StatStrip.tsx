import { type ElementType, type HTMLAttributes, type ReactNode, forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Skeleton } from "../../primitives/skeleton";
import { getI18n, useLabels } from "../../i18n/locale";
import type { IntegratedI18n } from "../../i18n/locale";

export type StatStripTone = "default" | "success" | "warning" | "danger";

const TONE: Record<StatStripTone, string> = {
  default: "text-muted-foreground",
  success: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
  danger: "text-red-700 dark:text-red-300",
};

/** `true` for `ms` after `value` changes (never on mount): a polled number visibly ticks. */
function useFlashing(value: unknown, enabled: boolean, ms = 700): boolean {
  const previous = useRef(value);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    if (!enabled) return;
    setFlashing(true);
    const timer = setTimeout(() => setFlashing(false), ms);
    return () => clearTimeout(timer);
  }, [value, enabled, ms]);
  return flashing;
}

export interface StatStripProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode;
}

/**
 * One bordered row of label-over-value cells, 1px dividers between them, two
 * columns below `sm`. The dense sibling of `KpiCard`: use it for a handful of
 * admin metrics at the top of a page (queue depth, errors, last run) where a
 * grid of full KPI tiles would be too heavy.
 */
export const StatStrip = forwardRef<HTMLUListElement, StatStripProps>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn(
      "grid shrink-0 list-none grid-cols-2 gap-px overflow-hidden rounded-lg border border-foreground/10 bg-foreground/10 p-0 sm:flex sm:flex-wrap dark:border-border dark:bg-border max-sm:[&>:last-child:nth-child(odd)]:col-span-2",
      className,
    )}
    {...props}
  />
));
StatStrip.displayName = "StatStrip";

export interface StatStripItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "onClick" | "children"> {
  label: ReactNode;
  value: ReactNode;
  /** Muted line under the value (a delta, a unit, "last 24 h"), colored by `tone`. */
  sub?: ReactNode;
  tone?: StatStripTone;
  /** Makes the cell a link. */
  href?: string;
  /** Makes the cell a button (when no `href`). */
  onClick?: () => void;
  /** Skeleton instead of the value. */
  loading?: boolean;
  /** Accessible name of the loading skeleton; overrides `labels.loading`. @default "Loading" */
  loadingLabel?: string;
  labels?: Partial<StatStripLabels>;
  /** Flash the value when it changes. @default true */
  animated?: boolean;
  /** Link component for `href`, e.g. a router `Link` (receives `href`). @default "a" */
  linkAs?: ElementType;
}

export interface StatStripLabels {
  /** Accessible name of a loading cell. */
  loading: string;
}
export const statStripLabelsFor = ({ t }: IntegratedI18n): StatStripLabels => ({
  loading: t("statStrip.loading"),
});

export const defaultStatStripLabels: StatStripLabels = statStripLabelsFor(getI18n("en", false));

export const StatStripItem = forwardRef<HTMLLIElement, StatStripItemProps>(
  (
    { label, value, sub, tone = "default", href, onClick, loading = false, loadingLabel, labels, animated = true, linkAs, className, ...props },
    ref,
  ) => {
    const flashing = useFlashing(typeof value === "object" ? null : value, animated);
    const text = useLabels(statStripLabelsFor, labels);
    const inner = (
      <>
        <span className="block line-clamp-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {loading ? (
          <Skeleton role="status" aria-label={loadingLabel ?? text.loading} className="mt-1 h-6 w-16" />
        ) : (
          <span
            className={cn(
              "-mx-1 block w-fit max-w-full break-words rounded-sm px-1 text-lg leading-tight font-semibold tabular-nums text-foreground",
              flashing ? "bg-primary/15 dark:bg-ring/25" : "bg-transparent transition-colors duration-700 ease-out motion-reduce:transition-none",
            )}
          >
            {value}
          </span>
        )}
        {sub ? <span className={cn("block break-words text-xs tabular-nums", TONE[tone])}>{sub}</span> : null}
      </>
    );
    const cell = "block w-full min-w-0 bg-background px-3 py-2 text-left";
    const interactive = `${cell} outline-none transition-colors hover:bg-foreground/6 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none`;
    const Link = linkAs ?? "a";
    return (
      <li ref={ref} className={cn("flex min-w-0 sm:min-w-[8rem] sm:flex-1", className)} {...props}>
        {href ? (
          <Link href={href} className={interactive}>
            {inner}
          </Link>
        ) : onClick ? (
          <button type="button" onClick={onClick} className={interactive}>
            {inner}
          </button>
        ) : (
          <div className={cell}>{inner}</div>
        )}
      </li>
    );
  },
);
StatStripItem.displayName = "StatStripItem";
