import { type HTMLAttributes, type ReactElement, useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { Skeleton } from "../../primitives/skeleton";
import { LoadingOverlay } from "./LoadingSpinner";

/** Returns `true` only once `active` has been true for `delayMs` — avoids a spinner flash on fast responses. */
export function useDelayedFlag(active: boolean, delayMs = 150): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    if (delayMs <= 0) {
      setShown(true);
      return;
    }
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);
  return active && (delayMs <= 0 || shown);
}

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  /** `skeleton` (default) shows placeholder lines; `spinner` shows a centered spinner. */
  variant?: "skeleton" | "spinner";
  /** Skeleton line count. Defaults to 3. */
  lines?: number;
  label?: string;
  /** Wait this long before showing anything. Defaults to 150ms; pass 0 to show immediately. */
  delayMs?: number;
}

/** Initial-load placeholder for a content area. Announces itself as `role="status"`. */
export const LoadingState = ({
  variant = "skeleton",
  lines = 3,
  label = "Loading…",
  delayMs = 150,
  className,
  ...props
}: LoadingStateProps): ReactElement => {
  const visible = useDelayedFlag(true, delayMs);
  if (variant === "spinner") {
    return (
      <div data-testid="loading-state" aria-busy="true" className={cn(!visible && "invisible", className)} {...props}>
        <LoadingOverlay label={label} />
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-testid="loading-state"
      className={cn("flex w-full flex-col gap-2 p-1", !visible && "invisible", className)}
      {...props}
    >
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
};

/** Thin indeterminate bar for a refetch over already-visible data. Place inside a `relative` container. */
export const RefreshBar = ({ active, className }: { active: boolean; className?: string }): ReactElement | null =>
  active ? (
    <div
      role="progressbar"
      aria-label="Refreshing"
      data-testid="refresh-bar"
      className={cn("absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden bg-muted", className)}
    >
      <div className="h-full w-1/3 animate-pulse bg-primary" />
    </div>
  ) : null;
