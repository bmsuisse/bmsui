import type { ReactElement, ReactNode } from "react";
import { type ErrorInput, toErrorInfo } from "../../lib/errorState";
import { ErrorState, InlineError } from "../error-state/ErrorState";
import { LoadingState, RefreshBar } from "../loading-spinner/LoadingState";

export interface AsyncBoundaryProps {
  /** A request is in flight. */
  loading?: boolean;
  error?: ErrorInput;
  onRetry?: () => void;
  /** The request finished with no data. Renders `emptyContent`. */
  empty?: boolean;
  emptyContent?: ReactNode;
  /** Placeholder for the first load. Defaults to `<LoadingState />`. */
  loadingContent?: ReactNode;
  /**
   * Whether `children` already has data to show (stale or previous). When true, a refetch keeps
   * the content with a refresh bar, and an error becomes a slim banner above it. Defaults to `!empty`.
   */
  hasData?: boolean;
  children: ReactNode;
}

/**
 * Standard loading → error → empty → content switch for server-fetched data.
 * First load: skeleton. Refetch: content + thin bar. Error without data: `ErrorState`.
 * Error with stale data: content under an `InlineError` banner.
 */
export const AsyncBoundary = ({
  loading = false,
  error,
  onRetry,
  empty = false,
  emptyContent,
  loadingContent,
  hasData,
  children,
}: AsyncBoundaryProps): ReactElement => {
  const failed = toErrorInfo(error) !== undefined;
  const showData = hasData ?? !empty;
  if (failed && !showData) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading && !showData && !failed) return <>{loadingContent ?? <LoadingState />}</>;
  if (empty && !showData) return <>{emptyContent ?? null}</>;
  return (
    <div className="relative">
      <RefreshBar active={loading} />
      {failed ? <InlineError error={error} onRetry={onRetry} className="mb-2" /> : null}
      {children}
    </div>
  );
};
