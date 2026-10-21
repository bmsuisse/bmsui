import type { KeyboardEvent, PointerEvent, ReactElement } from "react";
import { useRef } from "react";
import { KEYBOARD_RESIZE_STEP } from "../hooks/useColumnSizing";

interface ColumnResizeHandleProps {
  columnId: string;
  label: string;
  /** Called with the column's new width in px while dragging or on a key press. */
  onResize: (columnId: string, width: number) => void;
}

/**
 * Drag handle on a header cell's trailing edge. The starting width is read
 * from the rendered `<th>` rather than from state, because a column with no
 * explicit width has none in state yet.
 */
export function ColumnResizeHandle({ columnId, label, onResize }: ColumnResizeHandleProps): ReactElement {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  const cellWidth = (handle: HTMLElement): number => handle.parentElement?.getBoundingClientRect().width ?? 0;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: cellWidth(event.currentTarget) };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return;
    onResize(columnId, drag.current.startWidth + event.clientX - drag.current.startX);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? KEYBOARD_RESIZE_STEP : -KEYBOARD_RESIZE_STEP;
    onResize(columnId, cellWidth(event.currentTarget) + delta);
  };

  return (
    <div
      data-testid={`resize-handle-${columnId}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
    />
  );
}
