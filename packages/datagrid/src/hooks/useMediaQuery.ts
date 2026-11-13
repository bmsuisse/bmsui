import { useEffect, useState } from "react";

/** Below Tailwind's `md`: header popovers are cramped and keyboard-fragile on a phone, so filters get a modal and a one-month calendar. */
export const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

/**
 * Tracks whether a `matchMedia` query currently matches, updating on change.
 * Starts `false` and reads the query in an effect, so a server render and the
 * client's first render agree (no hydration mismatch).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (event: MediaQueryListEvent): void => setMatches(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
