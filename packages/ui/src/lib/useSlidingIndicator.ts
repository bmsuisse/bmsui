import type { RefObject } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

/**
 * Moves one shared `indicator` element over whichever descendant of
 * `container` matches `selector` (the current page, the selected option, the
 * active tab), so a CSS transition on its `transform`/`width`/`height` makes
 * the highlight glide between items instead of jumping. The first placement
 * (and any resize) is instant; later moves animate. While the indicator is
 * placed, `container` carries `data-indicator`, so the items' own selected
 * background can be dropped with a `[[data-indicator]_&]:` variant.
 *
 * `container` must be the indicator's positioned (`relative`) parent and the
 * items need `relative` so they paint above it. Re-measures when `deps`
 * change and when a descendant's `data-state`/`aria-selected`/`aria-current`
 * changes. Internal helper, not exported from the package.
 */
export function useSlidingIndicator(
  containerRef: RefObject<HTMLElement | null>,
  indicatorRef: RefObject<HTMLElement | null>,
  selector: string,
  enabled: boolean,
  deps: readonly unknown[] = [],
): void {
  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return undefined;
    if (!enabled) {
      container.removeAttribute("data-indicator");
      indicator.style.opacity = "0";
      return undefined;
    }
    const place = (instant: boolean): void => {
      const target = container.querySelector<HTMLElement>(selector);
      if (!target || target.offsetWidth === 0) {
        container.removeAttribute("data-indicator");
        indicator.style.opacity = "0";
        return;
      }
      const { x, y } = offsetWithin(target, container);
      const jump = instant || !container.hasAttribute("data-indicator");
      if (jump) indicator.style.transition = "none";
      indicator.style.width = `${target.offsetWidth}px`;
      indicator.style.height = `${target.offsetHeight}px`;
      indicator.style.transform = `translate(${x}px, ${y}px)`;
      indicator.style.opacity = "1";
      container.setAttribute("data-indicator", "");
      if (jump) {
        // Flush the instant position before re-enabling the CSS transition.
        void indicator.offsetWidth;
        indicator.style.transition = "";
      }
    };
    place(false);
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => place(true));
    resize?.observe(container);
    const mutation =
      typeof MutationObserver === "undefined" ? null : new MutationObserver(() => place(false));
    mutation?.observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-selected", "aria-current"],
    });
    return () => {
      resize?.disconnect();
      mutation?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selector, ...deps]);
}

/**
 * Layout offset of `el` inside `container` (padding-box coordinates, scroll
 * included), from `offsetLeft`/`offsetTop` rather than client rects so a
 * running transform on an ancestor (a dialog scaling in) doesn't skew it.
 */
function offsetWithin(el: HTMLElement, container: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== container) {
    x += node.offsetLeft;
    y += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    if (parent && parent !== container && !container.contains(parent)) break;
    if (parent && parent !== container) {
      x += parent.clientLeft;
      y += parent.clientTop;
    }
    node = parent;
  }
  if (node === container) return { x, y };
  // offsetParent chain left the container (it isn't positioned): fall back to rects.
  const c = container.getBoundingClientRect();
  const t = el.getBoundingClientRect();
  return {
    x: t.left - c.left + container.scrollLeft - container.clientLeft,
    y: t.top - c.top + container.scrollTop - container.clientTop,
  };
}

/** Shared motion classes for a `useSlidingIndicator` element: 150ms ease-out, none under reduced motion. */
export const slidingIndicatorClass =
  "pointer-events-none absolute left-0 top-0 opacity-0 transition-[transform,width,height,opacity] duration-150 ease-out motion-reduce:transition-none";
