import { type Ref, type RefCallback, useMemo } from "react";

type Cleanup = () => void;

/**
 * Combines refs (callback refs, ref objects, `undefined`/`null`) into one
 * callback ref whose identity only changes when one of the inputs changes —
 * for a component that needs its own ref while also forwarding the caller's.
 * React 19 callback refs that return a cleanup function get that cleanup
 * called on detach instead of being called with `null`.
 *
 * @example
 * const Field = forwardRef<HTMLInputElement, Props>((props, forwarded) => {
 *   const local = useRef<HTMLInputElement>(null);
 *   return <input ref={useMergedRefs(local, forwarded)} {...props} />;
 * });
 */
export function useMergedRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  // The refs themselves are the dependencies: a new callback only when one changes.
  return useMemo(() => mergeRefs(refs), refs);
}

function mergeRefs<T>(refs: Array<Ref<T> | undefined>): RefCallback<T> {
  const cleanups = new Map<number, Cleanup>();
  return (value: T | null) => {
    refs.forEach((ref, index) => {
      if (ref == null) return;
      if (typeof ref === "function") {
        if (value === null) {
          const cleanup = cleanups.get(index);
          cleanups.delete(index);
          if (cleanup) cleanup();
          else ref(null);
          return;
        }
        const result = (ref as (instance: T | null) => void | Cleanup)(value);
        if (typeof result === "function") cleanups.set(index, result);
        return;
      }
      (ref as { current: T | null }).current = value;
    });
  };
}
