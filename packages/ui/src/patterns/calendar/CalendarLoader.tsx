import { Component, lazy, type ReactElement, type ReactNode, Suspense, useState } from "react";
import { InlineError } from "../error-state/ErrorState";
import type { CalendarProps } from "./Calendar";

// `Calendar` is only needed once a popover opens: load it on demand (consumers' bundlers
// split it into its own chunk) and let `preloadCalendar` warm it up on hover/focus.
/** How the chunk is fetched; a test seam (not exported from the package) to simulate a failed load. */
export const calendarModule = { load: () => import("./Calendar") };
const makeLazy = () => lazy(() => calendarModule.load().then((m) => ({ default: m.Calendar })));
let LazyCalendar = makeLazy();

/** Starts loading the calendar chunk. A failed load is ignored here; opening the calendar shows it. */
export const preloadCalendar = (): void => {
  calendarModule.load().catch(() => {});
};

interface BoundaryProps {
  children: ReactNode;
  /** Shown in place of the calendar when its chunk could not be loaded (offline, deploy replaced it). */
  fallback: (retry: () => void) => ReactNode;
}

class LoadBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  retry = (): void => {
    LazyCalendar = makeLazy();
    this.setState({ failed: false });
  };
  render(): ReactNode {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}

export interface CalendarLoaderProps {
  /** Message when the calendar chunk fails to load. */
  loadFailed: string;
  retryLabel: string;
}

/**
 * `Calendar`, loaded lazily. Shows a same-size placeholder while loading and an inline error
 * with Retry when the chunk can't be fetched, so a failed load never takes the page down.
 */
export function CalendarLoader({ loadFailed, retryLabel, ...calendar }: CalendarLoaderProps & CalendarProps): ReactElement {
  // Re-render the subtree with the fresh lazy component after a retry.
  const [, setTick] = useState(0);
  return (
    <LoadBoundary
      fallback={(retry) => (
        <div className="flex w-[17.4rem] items-center p-3">
          <InlineError
            error={loadFailed}
            labels={{ retry: retryLabel }}
            onRetry={() => {
              retry();
              setTick((n) => n + 1);
            }}
          />
        </div>
      )}
    >
      <Suspense fallback={<div aria-busy="true" className="h-[20.4rem] w-[17.4rem]" />}>
        <LazyCalendar {...(calendar as CalendarProps)} />
      </Suspense>
    </LoadBoundary>
  );
}
