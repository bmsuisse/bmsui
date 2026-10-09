import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

/** Structured error shown by the grid's error states. Same shape as `@bmsuisse/ui`'s `ErrorInfo`. */
export interface ErrorInfo {
  title?: string;
  message?: string;
  /** Technical details (stack, response body) — shown behind a "Show details" toggle. */
  details?: string;
}

/** What the grids accept for `error` — pass a TanStack Query / SWR / `catch` error straight through. */
export type ErrorInput = ErrorInfo | Error | string | null | undefined | false;

export function toErrorInfo(error: unknown): ErrorInfo | undefined {
  if (error == null || error === false || error === "") return undefined;
  if (typeof error === "string") return { message: error };
  if (error instanceof Error) return { message: error.message || undefined, details: error.stack };
  if (typeof error === "object") {
    const { title, message, details } = error as ErrorInfo;
    if (title !== undefined || message !== undefined || details !== undefined) return { title, message, details };
  }
  try {
    return { message: typeof error === "object" ? "Unknown error" : String(error) };
  } catch {
    return { message: "Unknown error" };
  }
}

/** User-facing strings of the grid's loading/error/empty states. Anything omitted keeps its English default. */
export interface GridStatusLabels {
  loading: string;
  noResults: string;
  errorTitle: string;
  retry: string;
  showDetails: string;
  /** TreeDataGrid: shown on a node whose lazy children failed to load. */
  nodeLoadFailed: string;
}

export const defaultGridStatusLabels: GridStatusLabels = {
  loading: "Loading...",
  noResults: "No results.",
  errorTitle: "Couldn't load data",
  retry: "Retry",
  showDetails: "Show details",
  nodeLoadFailed: "Failed to load.",
};

export function resolveStatusLabels(overrides: Partial<GridStatusLabels> | undefined): GridStatusLabels {
  return overrides ? { ...defaultGridStatusLabels, ...overrides } : defaultGridStatusLabels;
}

/** Placeholder rows for a first load with no data yet. The label is screen-reader text. */
export function LoadingRows({ label, rows = 4 }: { label: string; rows?: number }): ReactElement {
  return (
    <div role="status" aria-busy="true" data-testid="grid-loading-rows" className="flex flex-col gap-2 p-1">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-4 animate-pulse rounded-md bg-muted" style={{ width: i === rows - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}

/** Thin indeterminate bar for a refetch over already-visible rows. Place in a `relative` container. */
export function RefreshBar(props: { "data-testid"?: string }): ReactElement {
  return (
    <div
      role="progressbar"
      aria-label="Refreshing"
      className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden bg-muted"
      {...props}
    >
      <div className="h-full w-1/3 animate-pulse bg-primary motion-reduce:animate-none" />
    </div>
  );
}

/** Block error: icon, title, message, collapsible details, Retry. */
export function GridErrorState({
  error,
  onRetry,
  labels,
}: {
  error: ErrorInput;
  onRetry?: () => void;
  labels: GridStatusLabels;
}): ReactElement | null {
  const info = toErrorInfo(error);
  if (!info) return null;
  return (
    <div
      role="alert"
      data-testid="grid-error-state"
      className="flex min-h-24 w-full flex-col items-center justify-center gap-1 p-4 text-center text-sm"
    >
      <ExclamationTriangleIcon className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="font-semibold">{info.title ?? labels.errorTitle}</p>
      {info.message ? <p className="text-muted-foreground">{info.message}</p> : null}
      {info.details ? (
        <details className="w-full max-w-lg text-left text-xs">
          <summary className="cursor-pointer select-none underline underline-offset-2">{labels.showDetails}</summary>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-muted-foreground">
            {info.details}
          </pre>
        </details>
      ) : null}
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
          {labels.retry}
        </Button>
      ) : null}
    </div>
  );
}

/** One-line error for tight spaces / stale-data banners: "⚠ message · Retry". */
export function GridInlineError({
  error,
  onRetry,
  labels,
  className,
}: {
  error: ErrorInput;
  onRetry?: () => void;
  labels: GridStatusLabels;
  className?: string;
}): ReactElement | null {
  const info = toErrorInfo(error);
  if (!info) return null;
  return (
    <span
      role="alert"
      data-testid="grid-inline-error"
      title={info.details}
      className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs text-red-700 dark:text-red-300", className)}
    >
      <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{info.message ?? info.title ?? labels.errorTitle}</span>
      {onRetry ? (
        <button type="button" className="shrink-0 underline underline-offset-2" onClick={onRetry}>
          {labels.retry}
        </button>
      ) : null}
    </span>
  );
}
