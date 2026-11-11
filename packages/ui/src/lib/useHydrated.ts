import { useSyncExternalStore } from "react";
import { isMacPlatform } from "./platform";

const subscribe = (): (() => void) => () => {};
const onClient = (): boolean => true;
const onServer = (): boolean => false;

/**
 * `false` during SSR and while hydrating server markup, `true` afterwards (and
 * on the very first render of a client-only mount). Gate anything that reads
 * the browser, the clock or the local time zone on it so server and client
 * render identical markup.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}

/**
 * Whether to spell shortcuts the Apple way (⌘/⌥/⇧). `false` on the server and
 * during hydration, the detected platform afterwards — no hydration mismatch.
 */
export function useIsMac(): boolean {
  return useSyncExternalStore(subscribe, isMacPlatform, onServer);
}
