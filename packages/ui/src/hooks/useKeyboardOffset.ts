import { useVisualViewport } from "./useVisualViewportHeight";

/** Below this the layout/visual viewport gap is browser chrome (URL bar), not a keyboard. */
const KEYBOARD_THRESHOLD_PX = 80;

export interface KeyboardGeometry {
  /** Px between the bottom of the layout viewport and the bottom of what is visible (0 while no keyboard is up). */
  offset: number;
  /** Height of the visible area while the keyboard is up (0 otherwise). */
  visibleHeight: number;
}

/** `useKeyboardOffset` plus the visible height, for clamping a sheet to what the keyboard leaves. */
export function useKeyboardGeometry(enabled = true): KeyboardGeometry {
  const viewport = useVisualViewport();
  if (!enabled || !viewport) return { offset: 0, visibleHeight: 0 };
  // Pinch-zoom shrinks the visual viewport too, but that is not a keyboard.
  if (window.visualViewport && Math.abs(window.visualViewport.scale - 1) > 0.01) return { offset: 0, visibleHeight: 0 };
  // Safari also pans the visual viewport down when it scrolls a field into view, so the visible bottom is
  // offsetTop + height from the top of the layout viewport, not just height.
  const offset = window.innerHeight - viewport.height - viewport.offsetTop;
  const covered = window.innerHeight - viewport.height;
  if (covered <= KEYBOARD_THRESHOLD_PX) return { offset: 0, visibleHeight: 0 };
  return { offset: Math.max(0, offset), visibleHeight: viewport.height };
}

/**
 * On iOS Safari and WKWebView the visual viewport shrinks when the on-screen keyboard opens while the
 * layout viewport stays put, so a `fixed` element anchored to the bottom ends up behind the keyboard.
 * Returns the gap in px (0 while no keyboard is up) to lift such an element by.
 */
export function useKeyboardOffset(enabled = true): number {
  return useKeyboardGeometry(enabled).offset;
}
