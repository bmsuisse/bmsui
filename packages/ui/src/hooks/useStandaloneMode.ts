import { useMediaQuery } from "../lib/useMediaQuery";

/**
 * `true` while the app runs as an installed PWA (`display-mode: standalone`, or iOS's
 * `navigator.standalone`), `false` in a normal browser tab. Use it to hide install UI and to
 * adjust chrome that a browser would otherwise provide (back button, reload).
 */
export function useStandaloneMode(): boolean {
  const standalone = useMediaQuery("(display-mode: standalone)");
  const ios = typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || ios;
}
