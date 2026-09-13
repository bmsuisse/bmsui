import { useEffect, useState } from "react";
import { useVisualViewportHeight } from "./useVisualViewportHeight";

/**
 * px to translate a bottom-docked element up by while an on-screen keyboard
 * is open; 0 otherwise.
 *
 * Compares the current visual-viewport height against the tallest one
 * observed so far, rather than a fixed baseline like `window.innerHeight`:
 * `innerHeight` doesn't shrink when the keyboard opens on most mobile
 * browsers, and the viewport's own height at mount may already be shrunk
 * (e.g. a field was focused before this hook mounted), so "tallest seen" is
 * the only reliable stand-in for "no keyboard up".
 *
 * A `threshold` gate (not a bare non-zero delta) exists because a mobile
 * browser's collapsing URL bar also shrinks the visual viewport by a small
 * amount as the user scrolls — without a threshold that would false-positive
 * as a keyboard opening. A real on-screen keyboard eats a much larger slice
 * of the viewport, so a threshold well above typical chrome movement (but
 * below the smallest keyboard) tells the two apart.
 */
export function useKeyboardOffset(options?: { threshold?: number }): number {
  const threshold = options?.threshold ?? 80;
  const viewportHeight = useVisualViewportHeight();
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    if (viewportHeight == null) return;
    setMaxHeight((prev) => (prev == null ? viewportHeight : Math.max(prev, viewportHeight)));
  }, [viewportHeight]);

  if (viewportHeight == null || maxHeight == null) return 0;

  const delta = maxHeight - viewportHeight;
  return delta > threshold ? delta : 0;
}
