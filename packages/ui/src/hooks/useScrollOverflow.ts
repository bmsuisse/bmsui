import { type RefCallback, useCallback, useEffect, useRef, useState } from "react";

/** Which edges of a scroll container have content hidden beyond them (physical sides, RTL-aware). */
export interface ScrollOverflow {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface UseScrollOverflowResult<T extends HTMLElement> extends ScrollOverflow {
  /** Attach to the scrolling element. */
  ref: RefCallback<T>;
}

const NONE: ScrollOverflow = { top: false, bottom: false, left: false, right: false };
/** Sub-pixel scroll positions (zoom, fractional sizes) shouldn't flicker the fades. */
const TOLERANCE = 1;

/** Reads the overflow flags of `el` at its current scroll position. */
export function measureScrollOverflow(el: HTMLElement): ScrollOverflow {
  const maxY = el.scrollHeight - el.clientHeight;
  const maxX = el.scrollWidth - el.clientWidth;
  const y = el.scrollTop;
  // In RTL, scrollLeft is 0 at the right edge and negative towards the left.
  const rtl = el.ownerDocument.defaultView?.getComputedStyle(el).direction === "rtl";
  const fromStart = Math.abs(el.scrollLeft);
  const start = fromStart > TOLERANCE;
  const end = fromStart < maxX - TOLERANCE;
  return {
    top: y > TOLERANCE,
    bottom: y < maxY - TOLERANCE,
    left: rtl ? end : start,
    right: rtl ? start : end,
  };
}

function same(a: ScrollOverflow, b: ScrollOverflow): boolean {
  return a.top === b.top && a.bottom === b.bottom && a.left === b.left && a.right === b.right;
}

/**
 * Tracks whether a scroll container has hidden content beyond each edge, to
 * show fade/shadow edges or "scroll for more" affordances only where there is
 * more. Re-measures on scroll, on resize of the container or its children
 * (`ResizeObserver`), and when children are added/removed. State only updates
 * when a flag flips, so scrolling doesn't re-render on every frame.
 *
 * @example
 * const { ref, top, bottom } = useScrollOverflow<HTMLDivElement>();
 * <div className="relative">
 *   {top && <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-background" />}
 *   <div ref={ref} className="max-h-80 overflow-y-auto">…</div>
 *   {bottom && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-background" />}
 * </div>
 */
export function useScrollOverflow<T extends HTMLElement = HTMLElement>(): UseScrollOverflowResult<T> {
  const [el, setEl] = useState<T | null>(null);
  const [state, setState] = useState<ScrollOverflow>(NONE);
  const current = useRef(state);

  const update = useCallback((target: HTMLElement) => {
    const next = measureScrollOverflow(target);
    if (same(current.current, next)) return;
    current.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    if (!el) {
      if (!same(current.current, NONE)) {
        current.current = NONE;
        setState(NONE);
      }
      return;
    }
    const measure = () => update(el);
    measure();
    el.addEventListener("scroll", measure, { passive: true });

    const resize = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    const observeChildren = () => {
      if (!resize) return;
      resize.disconnect();
      resize.observe(el);
      for (const child of Array.from(el.children)) resize.observe(child);
    };
    observeChildren();
    const mutations =
      typeof MutationObserver === "function"
        ? new MutationObserver(() => {
            observeChildren();
            measure();
          })
        : null;
    mutations?.observe(el, { childList: true });
    if (!resize) window.addEventListener("resize", measure);

    return () => {
      el.removeEventListener("scroll", measure);
      resize?.disconnect();
      mutations?.disconnect();
      if (!resize) window.removeEventListener("resize", measure);
    };
  }, [el, update]);

  return { ref: setEl as RefCallback<T>, ...state };
}
