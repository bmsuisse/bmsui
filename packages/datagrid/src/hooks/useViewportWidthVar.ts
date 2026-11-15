import { useEffect, type RefObject } from "react";

/**
 * Publishes the scroll container's visible width as `--dg-viewport-w`, only while the
 * table overflows it. Sticky full-row content (empty/error block, group headers) sizes
 * itself off it. Replaces `container-type: inline-size` + `100cqw`, which removed the
 * table's intrinsic width and collapsed the grid inside inline-block / w-fit / unsized
 * flex parents. Unset (no overflow, jsdom, SSR) the consumers fall back to 100%.
 */
export function useViewportWidthVar(scrollRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = (): void => {
      if (el.scrollWidth > el.clientWidth) el.style.setProperty("--dg-viewport-w", `${el.clientWidth}px`);
      else el.style.removeProperty("--dg-viewport-w");
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    const table = el.querySelector("table");
    if (table) observer.observe(table);
    return () => observer.disconnect();
  }, [scrollRef]);
}
