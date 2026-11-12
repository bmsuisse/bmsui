import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactElement } from "react";
import { type ErrorInput, toErrorInfo } from "../../lib/errorState";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";

export interface ErrorStateLabels {
  title: string;
  retry: string;
  showDetails: string;
}

export const defaultErrorStateLabels: ErrorStateLabels = {
  title: "Couldn't load data",
  retry: "Retry",
  showDetails: "Show details",
};

/** Extra attributes for the Retry button (`data-testid`, `className` for a larger tap target, ...). `onClick` and `type` stay under `onRetry`'s control. */
export type RetryButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type" | "children"> & {
  "data-testid"?: string;
};

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  error: ErrorInput;
  /** Shows a Retry button when set. */
  onRetry?: () => void;
  /** Attributes for the Retry button, e.g. a `data-testid` or a taller `className` on touch screens. */
  retryProps?: RetryButtonProps;
  /** `block` (default) is a centered panel for a whole content area; `compact` is a left-aligned tinted box for cards/popovers. */
  variant?: "block" | "compact";
  labels?: Partial<ErrorStateLabels>;
}

/** Content-area error: icon, title, message, optional collapsible details and a Retry button. Renders nothing when `error` is empty. */
export const ErrorState = ({
  error,
  onRetry,
  retryProps,
  variant = "block",
  labels,
  className,
  ...props
}: ErrorStateProps): ReactElement | null => {
  const info = toErrorInfo(error);
  if (!info) return null;
  const l = { ...defaultErrorStateLabels, ...labels };
  const compact = variant === "compact";
  return (
    <div
      role="alert"
      data-testid="error-state"
      className={cn(
        "flex gap-3 text-sm",
        compact
          ? "items-start rounded-md border border-destructive bg-destructive/10 p-3 text-red-800 dark:text-red-300"
          : "min-h-32 w-full flex-col items-center justify-center p-6 text-center",
        className,
      )}
      {...props}
    >
      <ExclamationTriangleIcon
        className={cn("shrink-0", compact ? "mt-0.5 h-4 w-4" : "h-8 w-8 text-destructive")}
        aria-hidden="true"
      />
      <div className={cn("flex min-w-0 flex-col gap-1", compact ? "items-start" : "items-center")}>
        <p className="font-semibold">{info.title ?? l.title}</p>
        {info.message ? <p className={cn(!compact && "text-muted-foreground")}>{info.message}</p> : null}
        {info.details ? (
          <details className="mt-1 w-full max-w-full text-left text-xs">
            <summary className="cursor-pointer select-none underline underline-offset-2">{l.showDetails}</summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-muted-foreground">
              {info.details}
            </pre>
          </details>
        ) : null}
        {onRetry ? (
          <Button
            variant="outline"
            size="sm"
            {...retryProps}
            className={cn("mt-2", retryProps?.className)}
            type="button"
            onClick={onRetry}
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            {l.retry}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export interface InlineErrorProps extends Omit<HTMLAttributes<HTMLSpanElement>, "title"> {
  error: ErrorInput;
  onRetry?: () => void;
  /** Attributes for the Retry button, e.g. a `data-testid`. */
  retryProps?: RetryButtonProps;
  labels?: Partial<Pick<ErrorStateLabels, "title" | "retry">>;
}

/** One-line error for tight spaces (dropdowns, filters, tree nodes, stale-data banners): "⚠ message · Retry". */
export const InlineError = ({
  error,
  onRetry,
  retryProps,
  labels,
  className,
  ...props
}: InlineErrorProps): ReactElement | null => {
  const info = toErrorInfo(error);
  if (!info) return null;
  const l = { ...defaultErrorStateLabels, ...labels };
  const text = info.message ?? info.title ?? l.title;
  return (
    <span
      role="alert"
      data-testid="inline-error"
      title={info.details}
      className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs text-red-700 dark:text-red-300", className)}
      {...props}
    >
      <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{text}</span>
      {onRetry ? (
        <button
          {...retryProps}
          className={cn("shrink-0 underline underline-offset-2", retryProps?.className)}
          type="button"
          onClick={onRetry}
        >
          {l.retry}
        </button>
      ) : null}
    </span>
  );
};
