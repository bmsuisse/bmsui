import { useEffect, useState } from "react";
import { useVisualViewportHeight } from "./useVisualViewportHeight";

/** Below this the layout/visual viewport gap is browser chrome (URL bar), not a keyboard. */
const KEYBOARD_THRESHOLD_PX = 80;

/**
 * On iOS Safari and WKWebView the visual viewport shrinks when the on-screen keyboard opens while the
 * layout viewport stays put, so a `fixed` element anchored to the bottom ends up behind the keyboard.
 * Returns the gap in px (0 while no keyboard is up) to lift such an element by.
 */
export function useKeyboardOffset(enabled = true): number {
  const visualViewportHeight = useVisualViewportHeight();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!enabled || visualViewportHeight == null) {
      setOffset(0);
      return;
    }
    const gap = window.innerHeight - visualViewportHeight;
    setOffset(gap > KEYBOARD_THRESHOLD_PX ? gap : 0);
  }, [enabled, visualViewportHeight]);

  return offset;
}
