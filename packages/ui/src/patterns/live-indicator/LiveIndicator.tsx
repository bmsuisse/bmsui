import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";
import { StatusDot } from "../status-dot/StatusDot";

export interface LiveIndicatorLabels {
  paused: string;
  updating: string;
  /** Text for the last update; `time` is already formatted for the locale. */
  updated: (time: string) => string;
  /** Tooltip when `intervalMs` is set. */
  refreshEvery: (seconds: number) => string;
}

export const defaultLiveIndicatorLabels: LiveIndicatorLabels = {
  paused: "Paused",
  updating: "Updating…",
  updated: (time) => `Updated ${time}`,
  refreshEvery: (seconds) => `Refreshes every ${seconds} s`,
};

export interface LiveIndicatorProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** When the data was last fetched: epoch ms (TanStack Query's `dataUpdatedAt`), a `Date`, or ISO. `0`/`undefined` before the first load. */
  updatedAt?: number | Date | string;
  /** A refetch is in flight. */
  fetching?: boolean;
  /** Polling is stopped: grey dot, no pulse. */
  paused?: boolean;
  /** Polling interval, shown as a tooltip. */
  intervalMs?: number;
  /** @default "de-CH" */
  locale?: string;
  labels?: Partial<LiveIndicatorLabels>;
  /** Fade the text in when it changes. @default true */
  animated?: boolean;
}

/**
 * Pulsing dot plus "Updated 14:02:11" for a polled page; put it in a
 * `PageHeader` meta slot or a toolbar. `paused` stops the pulse and says so.
 */
export const LiveIndicator = ({
  updatedAt,
  fetching = false,
  paused = false,
  intervalMs,
  locale = "de-CH",
  labels,
  animated = true,
  className,
  title,
  ...props
}: LiveIndicatorProps): ReactElement => {
  const l = { ...defaultLiveIndicatorLabels, ...labels };
  const ms = updatedAt instanceof Date || typeof updatedAt === "string" ? new Date(updatedAt).getTime() : updatedAt;
  const time = ms && !Number.isNaN(ms) ? new Intl.DateTimeFormat(locale, { timeStyle: "medium" }).format(ms) : "";
  const text = paused ? l.paused : fetching ? l.updating : time ? l.updated(time) : "";
  return (
    <span
      data-testid="live-indicator"
      data-state={paused ? "paused" : fetching ? "fetching" : "live"}
      title={title ?? (intervalMs ? l.refreshEvery(intervalMs / 1000) : undefined)}
      className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground", className)}
      {...props}
    >
      <StatusDot tone={paused || (!time && !fetching) ? "neutral" : "success"} pulse={!paused && (fetching || !!time)} label={text} hideLabel />
      <span
        key={text}
        aria-hidden="true"
        className={cn(
          "truncate",
          animated && "transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none",
        )}
      >
        {text}
      </span>
    </span>
  );
};
