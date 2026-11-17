import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * `false` while the browser reports no network (`navigator.onLine`), `true`
 * otherwise. Tracks the window `online`/`offline` events, SSR-safe (assumes
 * online on the server and during hydration). `onLine === true` only means
 * "a network interface is up", not that your API is reachable.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (typeof navigator === "undefined" ? true : navigator.onLine),
    () => true,
  );
}
