import { useCallback, useMemo, useRef, useState } from "react";
import { buildIndexMap } from "./rangeUtils";
import type { CellAddress, CellRange } from "./types";

export type NavigationDirection = "up" | "down" | "left" | "right";

export interface CellSelectionOptions {
  /** Every row id, in on-screen order — the FULL logical row list, not just currently-mounted virtual items, so navigation and range math work correctly regardless of virtualization. */
  rowIds: string[];
  /** Every editable-surface column id, in on-screen order. */
  columnIds: string[];
  /** Called when navigation lands on a row id that (per the caller) may not currently be mounted — e.g. to `virtualizer.scrollToIndex` it into view. Not called for a move that stays on the same row (left/right). */
  onNavigateToRow?: (rowId: string) => void;
}

export interface CellSelectionController {
  /** The committed selection (mouseup already happened, or a keyboard move), or `undefined` before any cell has ever been selected. */
  selection: CellRange | undefined;
  /** True while a mouse-drag range-select is in progress (between `startSelection` and `endDrag`). */
  isDragging: boolean;
  /** `selection` extended live to the drag's current cell while `isDragging`; otherwise identical to `selection`. This is the range a renderer should actually paint. */
  effectiveRange: CellRange | undefined;
  /** Mousedown on `cell`: starts a fresh single-cell selection, or (`extend: true`, e.g. shift+mousedown) extends the existing selection's focus corner to `cell` while keeping its anchor. Either way, also opens a drag (see `endDrag`) — a plain click-no-move sequence still round-trips through `startSelection`/`endDrag` and ends up exactly the same as if `updateDrag` were never called. */
  startSelection: (cell: CellAddress, options?: { extend?: boolean }) => void;
  /** Mousemove while dragging: updates the live drag-focus cell. Callers should coalesce rapid calls themselves (e.g. one `requestAnimationFrame`-scheduled flush per animation frame) — this hook applies whatever it's given without its own throttling. No-op if not currently dragging. */
  updateDrag: (cell: CellAddress) => void;
  /** Mouseup: commits the in-progress drag's live focus cell as the real selection. No-op if not currently dragging. */
  endDrag: () => void;
  /** Keyboard navigation: moves the focus corner by one row/column in `direction`, clamped to grid bounds. Collapses the selection to the new single cell unless `extend` (shift+arrow), which instead moves only the focus corner, keeping the existing anchor. */
  moveSelection: (direction: NavigationDirection, options?: { extend?: boolean }) => void;
  /** Directly replaces the selection, e.g. to leave a specific cell selected after a paste/fill commits. */
  setSelection: (range: CellRange) => void;
  clearSelection: () => void;
}

/**
 * Owns the rectangular range-selection cursor for `cellEditing` mode: the
 * committed selection, an in-progress mouse-drag's live extent, and
 * keyboard navigation — all keyed by row-id/column-id (via `rowIds`/
 * `columnIds`'s ordinal position), never by DOM node or virtualized index,
 * so a selection is meaningful even for a row that isn't currently mounted.
 */
export function useCellSelection({ rowIds, columnIds, onNavigateToRow }: CellSelectionOptions): CellSelectionController {
  const [selection, setSelectionState] = useState<CellRange | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFocus, setDragFocus] = useState<CellAddress | undefined>(undefined);
  // Mirrors `isDragging`/`dragFocus` synchronously for `updateDrag`/`endDrag`'s
  // own logic — those are plain callbacks (not effects), so they need a value
  // that's already correct on the very next call after `startSelection`/
  // `updateDrag`, not one that only catches up after React's next render.
  const draggingRef = useRef(false);
  const dragFocusRef = useRef<CellAddress | undefined>(undefined);

  const rowIndex = useMemo(() => buildIndexMap(rowIds), [rowIds]);
  const columnIndex = useMemo(() => buildIndexMap(columnIds), [columnIds]);

  const startSelection = useCallback((cell: CellAddress, options?: { extend?: boolean }) => {
    setSelectionState((prev) => (options?.extend && prev ? { anchor: prev.anchor, focus: cell } : { anchor: cell, focus: cell }));
    draggingRef.current = true;
    setIsDragging(true);
    dragFocusRef.current = undefined;
    setDragFocus(undefined);
  }, []);

  const updateDrag = useCallback((cell: CellAddress) => {
    if (!draggingRef.current) return;
    dragFocusRef.current = cell;
    setDragFocus(cell);
  }, []);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    const finalFocus = dragFocusRef.current;
    dragFocusRef.current = undefined;
    setDragFocus(undefined);
    if (finalFocus) {
      setSelectionState((prev) => (prev ? { anchor: prev.anchor, focus: finalFocus } : prev));
    }
  }, []);

  const moveSelection = useCallback(
    (direction: NavigationDirection, options?: { extend?: boolean }) => {
      setSelectionState((prev) => {
        const from = prev?.focus ?? { rowId: rowIds[0] ?? "", columnId: columnIds[0] ?? "" };
        const rowIdx = rowIndex.get(from.rowId);
        const colIdx = columnIndex.get(from.columnId);
        if (rowIdx === undefined || colIdx === undefined || rowIds.length === 0 || columnIds.length === 0) return prev;
        let nextRowIdx = rowIdx;
        let nextColIdx = colIdx;
        if (direction === "up") nextRowIdx = Math.max(0, rowIdx - 1);
        else if (direction === "down") nextRowIdx = Math.min(rowIds.length - 1, rowIdx + 1);
        else if (direction === "left") nextColIdx = Math.max(0, colIdx - 1);
        else nextColIdx = Math.min(columnIds.length - 1, colIdx + 1);
        const nextRowId = rowIds[nextRowIdx]!;
        const nextColumnId = columnIds[nextColIdx]!;
        if (nextRowId !== from.rowId) onNavigateToRow?.(nextRowId);
        const nextCell: CellAddress = { rowId: nextRowId, columnId: nextColumnId };
        const anchor = options?.extend ? (prev?.anchor ?? nextCell) : nextCell;
        return { anchor, focus: nextCell };
      });
    },
    [rowIds, columnIds, rowIndex, columnIndex, onNavigateToRow],
  );

  const setSelection = useCallback((range: CellRange) => {
    setSelectionState(range);
  }, []);

  const clearSelection = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
    setDragFocus(undefined);
    setSelectionState(undefined);
  }, []);

  const effectiveRange = useMemo<CellRange | undefined>(() => {
    if (!selection) return undefined;
    if (isDragging && dragFocus) return { anchor: selection.anchor, focus: dragFocus };
    return selection;
  }, [selection, isDragging, dragFocus]);

  return {
    selection,
    isDragging,
    effectiveRange,
    startSelection,
    updateDrag,
    endDrag,
    moveSelection,
    setSelection,
    clearSelection,
  };
}
