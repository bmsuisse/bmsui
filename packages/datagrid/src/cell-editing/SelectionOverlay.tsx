import type { MouseEvent as ReactMouseEvent, ReactElement } from "react";
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

/** Resolves `range`'s bounding rect within `container`'s own unscrolled content-space — `undefined` if either corner isn't currently mounted (e.g. scrolled out under virtualization). Shared between the selection rect and the fill-preview rect below; see the component doc for why content-space (not viewport-space) is what makes this scroll correctly with zero listeners of its own. */
function computeRangeRect(container: HTMLDivElement, range: CellRange): OverlayRect | undefined {
  const anchorEl = container.querySelector<HTMLElement>(cellSelector(range.anchor.rowId, range.anchor.columnId));
  const focusEl = container.querySelector<HTMLElement>(cellSelector(range.focus.rowId, range.focus.columnId));
  if (!anchorEl || !focusEl) return undefined;
  const containerRect = container.getBoundingClientRect();
  const a = anchorEl.getBoundingClientRect();
  const f = focusEl.getBoundingClientRect();
  const left = Math.min(a.left, f.left) - containerRect.left + container.scrollLeft;
  const top = Math.min(a.top, f.top) - containerRect.top + container.scrollTop;
  const right = Math.max(a.right, f.right) - containerRect.left + container.scrollLeft;
  const bottom = Math.max(a.bottom, f.bottom) - containerRect.top + container.scrollTop;
  return { top, left, width: right - left, height: bottom - top };
}

function rectsEqual(a: OverlayRect | undefined, b: OverlayRect | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

const HANDLE_SIZE = 8;

/**
 * Renders the current range selection (and, while a fill-handle drag is in
 * progress, a dashed preview of the range it would extend to) as absolutely-
 * positioned overlay divs, geometry read live from the DOM rects of the
 * relevant cells' `data-cell-row`/`data-cell-col` nodes — deliberately not
 * derived from `columnSizing`/row-height state, since reading the live DOM
 * always matches exactly what's rendered (including natural, non-resizing
 * column widths `columnSizing`'s own math doesn't account for).
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
 * nothing from either, only `range`/`fillPreviewRange` and the DOM — so
 * painting/updating a selection or a fill-drag (including during a fast
 * mouse-drag) never touches the column-definition memo that would otherwise
 * remount the whole table body.
 */
export function SelectionOverlay({
  containerRef,
  range,
  fillPreviewRange,
  onFillHandleMouseDown,
}: {
  containerRef: { current: HTMLDivElement | null };
  range: CellRange | undefined;
  /** The live preview range during a fill-handle drag, or `undefined` when not fill-dragging. */
  fillPreviewRange?: CellRange | undefined;
  /** Mousedown on the fill handle — starts a fill-drag. Omit to render no handle at all (e.g. a read-only or non-editable selection). */
  onFillHandleMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}): ReactElement | null {
  const [rect, setRect] = useState<OverlayRect | undefined>(undefined);
  const [previewRect, setPreviewRect] = useState<OverlayRect | undefined>(undefined);

  // No dependency array: geometry can change for reasons other than `range`/
  // `fillPreviewRange` themselves (a column resize, a virtualized row
  // mounting/unmounting) — this is deliberately cheap enough (at most four
  // `getBoundingClientRect` reads) to redo on every render of this small,
  // isolated component rather than trying to enumerate every input that
  // could move a cell.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const nextRect = range && container ? computeRangeRect(container, range) : undefined;
    setRect((prev) => (rectsEqual(prev, nextRect) ? prev : nextRect));
    const nextPreviewRect = fillPreviewRange && container ? computeRangeRect(container, fillPreviewRange) : undefined;
    setPreviewRect((prev) => (rectsEqual(prev, nextPreviewRect) ? prev : nextPreviewRect));
  });

  if (!rect) return null;
  return (
    <>
      <div
        data-testid="cell-selection-overlay"
        aria-hidden
        className="pointer-events-none absolute z-20 border-2 border-primary bg-primary/10"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />
      {previewRect && (
        <div
          data-testid="cell-fill-preview-overlay"
          aria-hidden
          className="pointer-events-none absolute z-20 border-2 border-dashed border-primary"
          style={{ top: previewRect.top, left: previewRect.left, width: previewRect.width, height: previewRect.height }}
        />
      )}
      {onFillHandleMouseDown && (
        <div
          data-testid="cell-fill-handle"
          role="button"
          aria-label="Fill handle: drag to fill adjacent cells"
          className="absolute z-30 cursor-crosshair border border-background bg-primary"
          style={{
            top: rect.top + rect.height - HANDLE_SIZE / 2,
            left: rect.left + rect.width - HANDLE_SIZE / 2,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
          }}
          onMouseDown={(event) => {
            // Not this component's own selection-rect mousedown — starting a
            // fill-drag must not ALSO start (or extend) a range-select drag
            // on the cell underneath the handle.
            event.stopPropagation();
            onFillHandleMouseDown(event);
          }}
        />
      )}
    </>
  );
}
