/**
 * Shared micro-animation helpers for the input set. Everything here uses the
 * Web Animations API (no keyframes CSS is shipped) and degrades to "no
 * animation" where it is unavailable (jsdom, old browsers).
 *
 * Conventions: enter 120–200 ms ease-out, exit ~120 ms ease-in, transform and
 * opacity only where possible; with `prefers-reduced-motion` nothing moves
 * (callers fall back to an opacity-only fade or to no animation).
 */

export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
export const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/** `el.animate(...)` when the Web Animations API exists, else `null`. */
export function animate(
  el: Element | null | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null {
  if (!el || typeof (el as HTMLElement).animate !== "function") return null;
  return (el as HTMLElement).animate(keyframes, options);
}
