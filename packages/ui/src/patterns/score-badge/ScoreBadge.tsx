import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";
import { badgeVariants } from "../../primitives/badge";
import { STATUS_TONE_CLASSES, type StatusTone } from "../status-badge/StatusBadge";

export interface ScoreThreshold {
  /** Lowest percentage (0–100) that gets this tone. */
  min: number;
  tone: StatusTone;
}

/** 85 % and up is `success`, everything below `warning`. */
export const defaultScoreThresholds: ScoreThreshold[] = [
  { min: 85, tone: "success" },
  { min: 0, tone: "warning" },
];

/** Picks the tone of the highest threshold whose `min` the percentage reaches (order of `thresholds` doesn't matter). */
export function resolveScoreTone(
  percent: number,
  thresholds: ScoreThreshold[] = defaultScoreThresholds,
): StatusTone {
  let best: ScoreThreshold | undefined;
  for (const threshold of thresholds) {
    if (percent >= threshold.min && (!best || threshold.min > best.min)) best = threshold;
  }
  return best?.tone ?? "neutral";
}

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-emerald-600 dark:bg-emerald-400",
  warning: "bg-amber-600 dark:bg-amber-400",
  info: "bg-sky-600 dark:bg-sky-400",
  error: "bg-red-700 dark:bg-red-400",
  neutral: "bg-muted-foreground",
};

export interface ScoreBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The score. `null`/`undefined` renders nothing. */
  value: number | null | undefined;
  /** Value that means 100 %. Pass `1` for 0–1 scores. @default 100 */
  max?: number;
  /** Tone steps, see {@link defaultScoreThresholds}. */
  thresholds?: ScoreThreshold[];
  /** Forces a tone and skips the thresholds. */
  tone?: StatusTone;
  /** Text for the percentage. @default `${Math.round(pct)}%` */
  format?: (percent: number) => string;
  /** Leading colour dot (decorative). @default true */
  showDot?: boolean;
  size?: "sm" | "md";
}

/**
 * A match / confidence / quality score as a tinted pill ("92%"): green from
 * 85 %, amber below, both tuned to stay AA-readable in light and dark. Use it
 * for search relevance or AI confidence; for a status word use `StatusBadge`.
 */
export const ScoreBadge = ({
  value,
  max = 100,
  thresholds,
  tone,
  format = (percent) => `${Math.round(percent)}%`,
  showDot = true,
  size = "md",
  className,
  ...props
}: ScoreBadgeProps): ReactElement | null => {
  if (value == null || Number.isNaN(value) || max <= 0) return null;
  const percent = (value / max) * 100;
  const resolved = tone ?? resolveScoreTone(percent, thresholds);
  return (
    // A span (not `Badge`'s div) so it's valid inside a button/link, e.g. in a ResultCard.
    <span
      className={cn(
        badgeVariants({ variant: "outline" }),
        "gap-1.5 font-semibold tabular-nums",
        size === "sm" ? "px-2 py-0 text-[10.5px]" : "px-2.5 py-0.5 text-[11px]",
        STATUS_TONE_CLASSES[resolved],
        className,
      )}
      {...props}
    >
      {showDot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT_CLASSES[resolved])} />}
      {format(percent)}
    </span>
  );
};

export interface RankBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Position in the list, 1-based. */
  rank: number;
}

/** Small square with a result's position ("1", "2" …) for ranked lists. */
export const RankBadge = ({ rank, className, ...props }: RankBadgeProps): ReactElement => (
  <span
    className={cn(
      "flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted font-mono font-semibold text-[11px] text-muted-foreground tabular-nums",
      className,
    )}
    {...props}
  >
    {rank}
  </span>
);
