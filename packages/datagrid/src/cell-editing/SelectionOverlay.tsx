import type { MouseEvent as ReactMouseEvent, ReactElement, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import type { CellRange } from "./types";

interface OverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OverlayGeometry {
  rect: OverlayRect | undefined;
  /** The anchor (active) cell inside a multi-cell `rect`, left untinted like Excel's. */
  anchorRect: OverlayRect | undefined;
  previewRect: OverlayRect | undefined;
  optionsRect: OverlayRect | undefined;
}

/** Matches a `[data-cell-row][data-cell-col]` `<td>` exactly — `CSS.escape` handles any id containing quotes/backslashes/etc. so the attribute selector below can't be broken out of. */
function cellSelector(rowId: string, columnId: string): string {
  const escape = (value: string): string => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&"));
  return `[data-cell-row="${escape(rowId)}"][data-cell-col="${escape(columnId)}"]`;
}

function findCell(container: HTMLDivElement, rowId: string, columnId: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(cellSelector(rowId, columnId));
}

/** Resolves `range`'s bounding rect within `container`'s own unscrolled content-space — `undefined` if either corner isn't currently mounted (e.g. scrolled out under virtualization). Shared by every rect below; see the component doc for why content-space (not viewport-space) is what makes this scroll correctly with zero listeners of its own. */
function computeRangeRect(container: HTMLDivElement, range: CellRange): OverlayRect | undefined {
  const anchorEl = findCell(container, range.anchor.rowId, range.anchor.columnId);
  const focusEl = findCell(container, range.focus.rowId, range.focus.columnId);
  if (!anchorEl || !focusEl) return undefined;
  const containerRect = container.getBoundingClientRect();
  const a = anchorEl.getBoundingClientRect();
  const f = focusEl.getBoundingClientRect();
  const left = Math.min(a.left, f.left) - containerRect.left - container.clientLeft + container.scrollLeft;
  const top = Math.min(a.top, f.top) - containerRect.top - container.clientTop + container.scrollTop;
  const right = Math.max(a.right, f.right) - containerRect.left - container.clientLeft + container.scrollLeft;
  const bottom = Math.max(a.bottom, f.bottom) - containerRect.top - container.clientTop + container.scrollTop;
  return { top, left, width: right - left, height: bottom - top };
}

function rectsEqual(a: OverlayRect | undefined, b: OverlayRect | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

function geometryEqual(a: OverlayGeometry, b: OverlayGeometry): boolean {
  return (
    rectsEqual(a.rect, b.rect) &&
    rectsEqual(a.anchorRect, b.anchorRect) &&
    rectsEqual(a.previewRect, b.previewRect) &&
    rectsEqual(a.optionsRect, b.optionsRect)
  );
}

const EMPTY_GEOMETRY: OverlayGeometry = { rect: undefined, anchorRect: undefined, previewRect: undefined, optionsRect: undefined };
const HANDLE_SIZE = 7;

/** Every element whose own size/position can move a cell: the table (rows added/grown), each header (column widths) and the two corner cells. */
function collectObservedElements(container: HTMLDivElement, range: CellRange | undefined): Element[] {
  const elements: Element[] = [];
  const table = container.querySelector("table");
  if (table) elements.push(table);
  for (const th of container.querySelectorAll("thead th")) elements.push(th);
  if (range) {
    const anchor = findCell(container, range.anchor.rowId, range.anchor.columnId);
    const focus = findCell(container, range.focus.rowId, range.focus.columnId);
    if (anchor) elements.push(anchor);
    if (focus && focus !== anchor) elements.push(focus);
  }
  return elements;
}

function sameElements(a: Element[], b: Element[]): boolean {
  return a.length === b.length && a.every((element, index) => element === b[index]);
}

/**
 * Renders the current range selection (and, while a fill-handle drag is in
 * progress, a dashed preview of the range it would extend to) as absolutely-
 * positioned overlay divs, geometry read live from the DOM rects of the
 * relevant cells' `data-cell-row`/`data-cell-col` nodes — deliberately not
 * derived from `columnSizing`/row-height state, since reading the live DOM
 * always matches exactly what's rendered (including natural, non-resizing
 * column widths `columnSizing`'s own math doesn't account for).
 *
 * Styled like Excel: a thin border, a light tint over a multi-cell range with
 * the active (anchor) cell left clear, and a small fill handle at the corner.
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
 * nothing from either, only its props and the DOM — so painting/updating a
 * selection or a fill-drag (including during a fast mouse-drag) never
 * touches the column-definition memo that would otherwise remount the whole
 * table body.
 */
export function SelectionOverlay({
  containerRef,
  range,
  fillPreviewRange,
  onFillHandleMouseDown,
  fillTooltip,
  fillOptions,
}: {
  containerRef: { current: HTMLDivElement | null };
  range: CellRange | undefined;
  /** The live preview range during a fill-handle drag, or `undefined` when not fill-dragging. */
  fillPreviewRange?: CellRange | undefined;
  /** Mousedown on the fill handle — starts a fill-drag. Omit to render no handle at all (e.g. a read-only or non-editable selection). */
  onFillHandleMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  /** Text shown next to the fill preview while dragging — the value the last cell would receive. */
  fillTooltip?: string | undefined;
  /** Content (the "Auto Fill Options" button) anchored below the bottom-right corner of `range` after a fill finished. */
  fillOptions?: { range: CellRange; content: ReactNode } | undefined;
}): ReactElement | null {
  const [geometry, setGeometry] = useState<OverlayGeometry>(EMPTY_GEOMETRY);

  // Read fresh inside the effects below via a ref, not as a dependency of the
  // listener effects — see those effects' own docs for why they must not
  // resubscribe on every `range`/`fillPreviewRange` change.
  const recomputeRef = useRef<() => void>(() => {});
  recomputeRef.current = () => {
    const container = containerRef.current;
    let next = EMPTY_GEOMETRY;
    if (container) {
      const rect = range ? computeRangeRect(container, range) : undefined;
      const isMultiCell = range && (range.anchor.rowId !== range.focus.rowId || range.anchor.columnId !== range.focus.columnId);
      next = {
        rect,
        anchorRect:
          rect && isMultiCell && range
            ? computeRangeRect(container, { anchor: range.anchor, focus: range.anchor })
            : undefined,
        previewRect: fillPreviewRange ? computeRangeRect(container, fillPreviewRange) : undefined,
        optionsRect: fillOptions ? computeRangeRect(container, fillOptions.range) : undefined,
      };
    }
    setGeometry((prev) => (geometryEqual(prev, next) ? prev : next));
  };

  // No dependency array: geometry can change for reasons other than `range`/
  // `fillPreviewRange` themselves (a column resize, a virtualized row
  // mounting/unmounting) — this is deliberately cheap enough (a handful of
  // `getBoundingClientRect` reads) to redo on every render of this small,
  // isolated component rather than trying to enumerate every input that
  // could move a cell.
  useLayoutEffect(() => {
    recomputeRef.current();
  });

  // Layout can also shift with NO React render at all: an editor mounting in
  // a cell reflows the table's auto column widths, a Radix Select fills its
  // value in after the first paint, fonts load. A ResizeObserver over the
  // table, its headers and the corner cells re-measures on every such shift,
  // so the overlay never lingers at a stale position. One observer, re-pointed
  // only when the observed element set actually changes.
  const observerRef = useRef<ResizeObserver | null>(null);
  const observedRef = useRef<Element[]>([]);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const elements = collectObservedElements(container, range);
    if (sameElements(elements, observedRef.current)) return;
    observerRef.current ??= new ResizeObserver(() => recomputeRef.current());
    observerRef.current.disconnect();
    for (const element of elements) observerRef.current.observe(element);
    observedRef.current = elements;
  });
  useLayoutEffect(
    () => () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      observedRef.current = [];
    },
    [],
  );

  // A `pinned` cell's `getBoundingClientRect()` is reported in VIEWPORT
  // space (fixed by `position: sticky`) rather than scrolling with the
  // content the way every other cell's does — `computeRangeRect`'s own
  // "unscrolled content-space" formula (rect minus the container's rect,
  // plus the container's current scroll offset) only cancels out correctly
  // for a cell that actually moves with `scrollLeft`/`scrollTop`. A plain
  // horizontal/vertical scroll of the container is otherwise invisible to
  // this component — nothing about it changes React state anywhere in
  // `<DataGrid>`, so the `useLayoutEffect` above (which only reruns when
  // THIS component re-renders) would leave a selection anchored on a pinned
  // column silently drifting away from the real cell as the container keeps
  // scrolling. A plain native `scroll` listener (passive; this only ever
  // reads geometry, never calls `preventDefault`) is what makes a pinned
  // corner track correctly; recomputing here is a no-op for the common case
  // of an all-unpinned selection, since that math already cancels out scroll
  // on its own.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function handleScroll(): void {
      recomputeRef.current();
    }
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only resubscribes when the container itself changes identity, not on every range/fillPreviewRange change; `recomputeRef.current` is reassigned above on every render and read fresh from inside the listener.
  }, [containerRef.current]);

  const { rect, anchorRect, previewRect, optionsRect } = geometry;
  if (!rect) return null;
  const container = containerRef.current;
  const tooltipFlipsLeft =
    previewRect !== undefined &&
    container !== null &&
    previewRect.left + previewRect.width + 160 > container.scrollLeft + container.clientWidth;

  // Even-odd path: the full range minus the anchor cell, so the active cell
  // stays untinted. Coordinates are relative to the tint div's own box.
  const tintClip = anchorRect
    ? `path(evenodd, 'M0 0H${rect.width}V${rect.height}H0Z M${anchorRect.left - rect.left} ${anchorRect.top - rect.top}h${anchorRect.width}v${anchorRect.height}h${-anchorRect.width}Z')`
    : undefined;

  return (
    <>
      {anchorRect && (
        <div
          data-testid="cell-selection-tint"
          aria-hidden
          className="pointer-events-none absolute z-20 bg-foreground/[0.07]"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, clipPath: tintClip }}
        />
      )}
      <div
        data-testid="cell-selection-overlay"
        aria-hidden
        className="pointer-events-none absolute z-20 border-2 border-primary"
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
      {previewRect && fillTooltip !== undefined && (
        <div
          data-testid="cell-fill-tooltip"
          aria-hidden
          className="pointer-events-none absolute z-40 max-w-64 truncate whitespace-nowrap rounded border border-border bg-popover px-2 py-0.5 text-xs text-popover-foreground shadow-sm"
          // Beside the corner (not below it) so it stays inside the grid on the last row; flips to the left near the right edge.
          style={{
            top: previewRect.top + previewRect.height - 26,
            left: previewRect.left + previewRect.width + (tooltipFlipsLeft ? -8 : 8),
            transform: tooltipFlipsLeft ? "translateX(-100%)" : undefined,
          }}
        >
          {fillTooltip}
        </div>
      )}
      {onFillHandleMouseDown && (
        <div
          data-testid="cell-fill-handle"
          role="button"
          aria-label="Fill handle: drag to fill adjacent cells"
          className="absolute z-30 cursor-crosshair border border-background bg-primary"
          style={{
            top: rect.top + rect.height - HANDLE_SIZE / 2 - 1,
            left: rect.left + rect.width - HANDLE_SIZE / 2 - 1,
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
      {fillOptions && optionsRect && !previewRect && (
        // React events from the (portalled) menu still bubble through here to the grid's own key/mouse handlers (Enter = move down, typing = start editing), which would dismiss the button mid-interaction.
        <div
          className="absolute z-30"
          style={{ top: optionsRect.top + optionsRect.height + 6, left: optionsRect.left + optionsRect.width - 20 }}
          onKeyDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {fillOptions.content}
        </div>
      )}
    </>
  );
}
