import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { deriveStatusLabel, resolveStatusTone, type StatusTone } from "../status-badge/StatusBadge";

/**
 * Dot fills per tone. Fixed palette shades (the theme has no success/warning/
 * info tokens, same reasoning as `StatusBadge`); 500-level shades read on both
 * the light and the dark surface, so no `dark:` override is needed.
 */
const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-sky-500",
  neutral: "bg-muted-foreground/60",
};

export interface StatusDotProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Raw status value, resolved to a tone like `StatusBadge` does (`"active"` → success). Optional when `tone` is set. */
  status?: string;
  /** Explicit tone; skips `toneMap` and the built-in status vocabulary. */
  tone?: StatusTone;
  /** Caller status→tone mapping (case-insensitive), checked before the built-in one. */
  toneMap?: Record<string, StatusTone>;
  /** Text next to the dot. Defaults to the title-cased `status`. Pass `hideLabel` to keep it for screen readers only. */
  label?: ReactNode;
  /** Render the label visually hidden: a bare dot in a dense table cell or on an avatar. */
  hideLabel?: boolean;
  /** Soft ping ring around the dot for live states ("Online", "Syncing"). Off under reduced motion. */
  pulse?: boolean;
  /** `sm` (default, 8px) or `md` (10px). */
  size?: "sm" | "md";
}

/**
 * A small colored dot with a label — the quiet sibling of `StatusBadge`. Use it
 * where a filled pill would be too loud: table cells, list rows, a presence
 * indicator. Same tones and status vocabulary as `StatusBadge`.
 */
export const StatusDot = ({
  status,
  tone,
  toneMap,
  label,
  hideLabel = false,
  pulse = false,
  size = "sm",
  className,
  ...props
}: StatusDotProps): ReactElement => {
  const resolved = resolveStatusTone(status ?? "", tone, toneMap);
  const text = label ?? (status ? deriveStatusLabel(status) : null);
  const dot = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  return (
    <span
      data-testid="status-dot"
      data-tone={resolved}
      className={cn("inline-flex items-center gap-1.5 text-xs text-foreground", className)}
      {...props}
    >
      <span aria-hidden="true" className={cn("relative inline-flex shrink-0", dot)}>
        {pulse ? (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden",
              DOT_CLASSES[resolved],
            )}
          />
        ) : null}
        <span className={cn("relative inline-flex rounded-full", dot, DOT_CLASSES[resolved])} />
      </span>
      {text != null ? <span className={cn(hideLabel && "sr-only")}>{text}</span> : null}
    </span>
  );
};
