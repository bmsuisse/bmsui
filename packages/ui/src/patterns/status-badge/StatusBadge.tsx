import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../../primitives/badge";

/** Semantic color intent for a {@link StatusBadge}. */
export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

/**
 * Class names per tone. `success` / `warning` / `info` fall back to fixed
 * Tailwind palette shades (with `dark:` variants, since this package's dark
 * mode is a `.dark` ancestor class) because the shared theme currently only
 * defines background/foreground/primary/muted/popover/accent/destructive/
 * border/input/ring tokens — no warning/info/success tokens exist yet, same
 * reasoning AlertBox uses for those tones. `error` and `neutral` instead
 * reuse the existing `destructive` and `muted` theme tokens directly.
 */
const TONE_CLASSES: Record<StatusTone, string> = {
  success: "border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  warning: "border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  info: "border-transparent bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  error: "border-transparent bg-destructive/15 text-destructive",
  neutral: "border-transparent bg-muted text-muted-foreground",
};

/** Built-in status vocabulary, matched case-insensitively against `status.toLowerCase()`. */
const DEFAULT_TONE_MAP: Record<string, StatusTone> = {
  active: "success",
  approved: "success",
  completed: "success",
  paid: "success",
  done: "success",
  pending: "warning",
  draft: "warning",
  in_review: "warning",
  inreview: "warning",
  rejected: "error",
  failed: "error",
  cancelled: "error",
  canceled: "error",
  overdue: "error",
  inactive: "neutral",
  archived: "neutral",
  new: "info",
};

/** Title-cases a raw status value and replaces underscores/hyphens with spaces, e.g. `"in_review"` -> `"In Review"`. */
function deriveLabel(status: string): string {
  return status
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Resolves a status to a {@link StatusTone}.
 *
 * Resolution order: explicit `tone` prop > caller's `toneMap` (case-insensitive
 * key match) > built-in default map (case-insensitive) > `neutral` fallback.
 */
function resolveTone(status: string, tone?: StatusTone, toneMap?: Record<string, StatusTone>): StatusTone {
  if (tone) {
    return tone;
  }

  const key = status.toLowerCase();

  if (toneMap) {
    for (const [candidate, candidateTone] of Object.entries(toneMap)) {
      if (candidate.toLowerCase() === key) {
        return candidateTone;
      }
    }
  }

  return DEFAULT_TONE_MAP[key] ?? "neutral";
}

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Raw status value from the caller's domain, e.g. `"pending"`, `"APPROVED"`, `"in_review"`. */
  status: string;
  /** Overrides the displayed text. Defaults to a title-cased, space-separated derivation of `status`. */
  label?: string;
  /** Explicit tone override. When provided, `toneMap` and the built-in default map are skipped entirely. */
  tone?: StatusTone;
  /** Caller-supplied status-to-tone mapping (case-insensitive keys), checked before the built-in default map. */
  toneMap?: Record<string, StatusTone>;
}

/**
 * A status-to-color badge, built on the shared `Badge` primitive.
 *
 * Centralizes the status->color mapping that's otherwise reimplemented ad hoc
 * per app: callers can rely on the built-in English status vocabulary, supply
 * their own `toneMap` for domain-specific statuses, or force a `tone`
 * outright.
 */
export const StatusBadge = ({ status, label, tone, toneMap, className, ...props }: StatusBadgeProps): ReactElement => {
  const resolvedTone = resolveTone(status, tone, toneMap);
  const displayLabel = label ?? deriveLabel(status);

  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[resolvedTone], className)} {...props}>
      {displayLabel}
    </Badge>
  );
};
