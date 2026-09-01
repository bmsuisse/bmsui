import type { ReactElement } from "react";
import { useLayoutEffect, useState } from "react";
import type { CellRange } from "./types";

interface OverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Matches a `[data-cell-row][data-cell-col]` `<td>` exactly — `CSS.escape` handles any id containing quotes/backslashes/etc. so the attribute selector below can't be broken out of. */
function cellSelector(rowId: string, columnId: string): string {
  const escape = (value: string): string => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&"));
  return `[data-cell-row="${escape(rowId)}"][data-cell-col="${escape(columnId)}"]`;
}

/**
 * Renders the current range selection as one absolutely-positioned overlay
 * div, geometry read live from the DOM rects of the anchor/focus cells'
 * `data-cell-row`/`data-cell-col` nodes — deliberately not derived from
 * `columnSizing`/row-height state, since reading the live DOM always matches
 * exactly what's rendered (including natural, non-resizing column widths
 * `columnSizing`'s own math doesn't account for).
 *
 * Must render as a CHILD of the scrollable container (not a sibling outside
 * it), with that container given `position: relative` — position/left/top
 * are computed in the container's own unscrolled content-space (rect minus
 * the container's rect, plus the container's current scroll offset), so once
 * set, the overlay scrolls together with the table content via ordinary
 * browser scrolling with no scroll listener of its own. A virtualized grid's
 * scroll-driven re-renders (the virtualizer's own React state) naturally
 * recompute this on every such render; a non-virtualized grid never needs to
 * (native scroll changes nothing in content-space).
 *
 * Deliberately isolated from `visibleColumns`/`tanstackColumns` — it reads
 * nothing from either, only `range` and the DOM — so painting/updating a
 * selection (including during a fast mouse-drag) never touches the column-
 * definition memo that would otherwise remount the whole table body.
 */
export function SelectionOverlay({
  containerRef,
  range,
}: {
  containerRef: { current: HTMLDivElement | null };
  range: CellRange | undefined;
}): ReactElement | null {
  const [rect, setRect] = useState<OverlayRect | undefined>(undefined);

  // No dependency array: geometry can change for reasons other than `range`
  // itself (a column resize, a virtualized row mounting/unmounting) — this
  // is deliberately cheap enough (two `getBoundingClientRect` reads at most)
  // to redo on every render of this small, isolated component rather than
  // trying to enumerate every input that could move a cell.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!range || !container) {
      setRect((prev) => (prev === undefined ? prev : undefined));
      return;
    }
    const anchorEl = container.querySelector<HTMLElement>(cellSelector(range.anchor.rowId, range.anchor.columnId));
    const focusEl = container.querySelector<HTMLElement>(cellSelector(range.focus.rowId, range.focus.columnId));
    if (!anchorEl || !focusEl) {
      // Either corner is currently unmounted (scrolled out under
      // virtualization) — no rect to draw. Known MVP limitation: a selection
      // spanning far beyond the virtualized window simply has no visible
      // highlight until scrolled closer; it's still fully tracked in state.
      setRect((prev) => (prev === undefined ? prev : undefined));
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const a = anchorEl.getBoundingClientRect();
    const f = focusEl.getBoundingClientRect();
    const left = Math.min(a.left, f.left) - containerRect.left + container.scrollLeft;
    const top = Math.min(a.top, f.top) - containerRect.top + container.scrollTop;
    const right = Math.max(a.right, f.right) - containerRect.left + container.scrollLeft;
    const bottom = Math.max(a.bottom, f.bottom) - containerRect.top + container.scrollTop;
    const next = { top, left, width: right - left, height: bottom - top };
    setRect((prev) =>
      prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height
        ? prev
        : next,
    );
  });

  if (!rect) return null;
  return (
    <div
      data-testid="cell-selection-overlay"
      aria-hidden
      className="pointer-events-none absolute z-20 border-2 border-primary bg-primary/10"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    />
  );
}
