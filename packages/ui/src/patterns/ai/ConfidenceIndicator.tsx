import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

export type ConfidenceBand = "high" | "medium" | "low" | "unknown";

export interface ConfidenceIndicatorProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 0..1. Consumer normalises 0..100 itself. `null`/`undefined`/`NaN` renders the "unknown" state. */
  value: number | null | undefined;
  /** @default { high: 0.85, medium: 0.65 } */
  thresholds?: { high: number; medium: number };
  /**
   * `meter` = bars only, `meter-label` = bars + qualitative label, `label` =
   * label only (no bars), `percent` = the numeric percent only, for a dense
   * table column that can't spare the meter's width.
   * @default "meter-label"
   */
  format?: "meter" | "meter-label" | "label" | "percent";
  /** Appends "· 82 %" to the visible label. The percent is always present in `title`/`aria-label` regardless. @default false */
  showPercent?: boolean;
  labels?: { high?: string; medium?: string; low?: string; unknown?: string };
  /** @default "md" */
  size?: "sm" | "md";
  testId?: string;
}

/**
 * The one place the bands are defined. Exported because anything that states a
 * confidence in words next to this meter — `AiSuggestion`'s accessible name,
 * for instance — has to agree with the bars the user is looking at. A second
 * copy of these two numbers drifts silently the first time they're tuned.
 */
export const DEFAULT_CONFIDENCE_THRESHOLDS = { high: 0.85, medium: 0.65 };

const DEFAULT_THRESHOLDS = DEFAULT_CONFIDENCE_THRESHOLDS;
const DEFAULT_LABELS: Record<ConfidenceBand, string> = {
  high: "High",
  medium: "Medium",
  low: "Low – check",
  unknown: "—",
};

/** Clamps into 0..1, treating non-finite input as absent rather than 0. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Maps a 0..1 score onto a band. Exported so callers that render confidence as
 * words rather than bars stay in lockstep with this component.
 */
export function resolveConfidenceBand(
  value: number | null | undefined,
  thresholds: { high: number; medium: number } = DEFAULT_CONFIDENCE_THRESHOLDS,
): ConfidenceBand {
  if (value == null || !Number.isFinite(value)) return "unknown";
  const v = clamp01(value);
  if (v >= thresholds.high) return "high";
  if (v >= thresholds.medium) return "medium";
  return "low";
}

/** Per-band: how many of the 3 bars are filled, and the filled-bar color class. */
const BAND_BARS: Record<ConfidenceBand, { filled: number; barColor: string }> = {
  high: { filled: 3, barColor: "bg-[var(--ai,#6366f1)]" },
  medium: { filled: 2, barColor: "bg-foreground/50" },
  low: { filled: 1, barColor: "bg-amber-500" },
  unknown: { filled: 0, barColor: "" },
};

const BAND_LABEL_CLASS: Record<ConfidenceBand, string> = {
  high: "text-foreground",
  medium: "text-muted-foreground",
  low: "text-amber-700 dark:text-amber-300",
  unknown: "text-muted-foreground",
};

const SIZE_TEXT: Record<NonNullable<ConfidenceIndicatorProps["size"]>, string> = {
  sm: "text-[11px]",
  md: "text-xs",
};

function Bars({ filled, barColor, size }: { filled: number; barColor: string; size: "sm" | "md" }): ReactElement {
  const height = size === "sm" ? "h-1.5" : "h-2";
  return (
    <span aria-hidden="true" className="inline-flex items-end gap-0.5">
      {[0, 1, 2].map((i) => {
        const isFilled = i < filled;
        return (
          <span
            key={i}
            data-filled={isFilled ? "true" : "false"}
            className={cn(
              "w-1 rounded-full",
              height,
              isFilled ? barColor : "bg-foreground/15",
            )}
          />
        );
      })}
    </span>
  );
}

/**
 * A 3-bar signal meter plus a qualitative label for a model's confidence
 * score, extracted after finding three divergent confidence widgets (a
 * percent-only text, a green/yellow/red dot, and a 0-100 progress bar)
 * scattered across one consuming app — each implying a different, unstated
 * threshold and color rule. This centralizes both.
 *
 * NOT a `StatusBadge` variant: `StatusBadge` maps a discrete status string
 * (`"approved"`, `"pending"`) to a tone via a lookup table. Confidence is a
 * continuous 0..1 value compared against tunable thresholds and rendered as
 * a graded glyph (how many bars), not a single tone swatch — and critically,
 * it must never borrow `StatusBadge`'s `success` (green) tone, so folding it
 * into that component's tone enum would make the wrong color reachable by
 * accident.
 *
 * NOT a 0-100 progress bar: a 64px determinate bar visually claims a
 * precision that an uncalibrated model score doesn't have ("73% confident"
 * read as a bar invites comparing 73 vs 74 to the pixel), and it costs
 * table-row width a dense list can't spare. Three short bars plus a word
 * communicate "roughly how much to trust this" without the false precision;
 * `format="percent"` exists for the table that genuinely needs the number.
 *
 * Color rules (team rule, not a per-instance choice):
 * - **Never green.** Green is reserved for human-verified states
 *   (`approved`/`paid`/`completed` in `StatusBadge`). A model scoring itself
 *   90% is not that, and coloring it green invites the falsely-reassuring
 *   reading that it's been checked.
 * - **Never red.** Low confidence is a prompt to look closer, not a failure
 *   — red is reserved for actual errors.
 * - **Amber only at `low`**, because "this needs a human to look at it" is
 *   genuinely the warning semantic AlertBox/StatusBadge already use amber
 *   for elsewhere; the exact `text-amber-700 dark:text-amber-300` pair is
 *   reused from AlertBox's warning variant so the tone reads identically.
 */
export const ConfidenceIndicator = ({
  value,
  thresholds = DEFAULT_THRESHOLDS,
  format = "meter-label",
  showPercent = false,
  labels,
  size = "md",
  className,
  testId,
  ...props
}: ConfidenceIndicatorProps): ReactElement => {
  const band = resolveConfidenceBand(value, thresholds);
  const { filled, barColor } = BAND_BARS[band];
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
  const label = resolvedLabels[band];
  const hasPercent = value != null && Number.isFinite(value);
  const percent = hasPercent ? Math.round(clamp01(value) * 100) : null;

  const a11yText = percent != null ? `Confidence: ${band} (${percent} %)` : `Confidence: ${band}`;

  const visibleLabel =
    showPercent && percent != null && (format === "meter-label" || format === "label") ? `${label} · ${percent} %` : label;

  return (
    <span
      data-testid={testId}
      data-band={band}
      aria-label={a11yText}
      title={a11yText}
      className={cn("inline-flex items-center gap-1.5", SIZE_TEXT[size], className)}
      {...props}
    >
      {(format === "meter" || format === "meter-label") && <Bars filled={filled} barColor={barColor} size={size} />}
      {format === "meter-label" && <span className={cn("font-medium", BAND_LABEL_CLASS[band])}>{visibleLabel}</span>}
      {format === "label" && <span className={cn("font-medium", BAND_LABEL_CLASS[band])}>{visibleLabel}</span>}
      {format === "percent" && (
        <span className={cn("font-medium tabular-nums", BAND_LABEL_CLASS[band])}>{percent != null ? `${percent} %` : "—"}</span>
      )}
    </span>
  );
};
