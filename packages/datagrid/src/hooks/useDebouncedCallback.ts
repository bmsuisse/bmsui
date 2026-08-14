import { useEffect, useMemo, useRef } from "react";

export interface DebouncedCallback<TArgs extends unknown[]> {
  /** Schedules `callback`, resetting the timer if one is already pending. */
  run: (...args: TArgs) => void;
  /**
   * Discards any pending scheduled call without invoking it. Callers that
   * also have an immediate, non-debounced path to the same effect (see
   * `<DataGrid>`'s `useGridState`, where sort/page changes call the
   * underlying callback immediately) need this to prevent an
   * already-in-flight debounced call from firing later with stale state and
   * overwriting the immediate one.
   */
  cancel: () => void;
}

/**
 * Returns a stable `{ run, cancel }` pair. `run` delays invoking `callback`
 * until `delayMs` has elapsed since the last call, resetting the timer on
 * every call in between (standard trailing-edge debounce). Used by
 * `<DataGrid>` in `"server"` mode to avoid firing `onStateChange` on every
 * keystroke while a filter widget is being typed into.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number,
): DebouncedCallback<TArgs> {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return useMemo(() => {
    return {
      run: (...args: TArgs): void => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
        }, delayMs);
      },
      cancel: (): void => {
        clearTimeout(timeoutRef.current);
      },
    };
  }, [delayMs]);
}
