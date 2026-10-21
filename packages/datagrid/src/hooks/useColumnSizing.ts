import { useCallback, useState } from "react";
import type { ColumnSizingState } from "@tanstack/react-table";

/** Floor for a resized column — below it the header label is unreadable. */
export const MIN_COLUMN_SIZE = 40;

/** Pixels a focused resize handle moves per ArrowLeft/ArrowRight key press. */
export const KEYBOARD_RESIZE_STEP = 10;

/**
 * Controlled/uncontrolled column-width state, same pattern as `<DataGrid>`'s
 * `columnSizing`/`onColumnSizingChange`: with no `controlled` value the hook
 * owns the state, and `onChange` fires either way.
 */
export function useColumnSizing(
  controlled: ColumnSizingState | undefined,
  onChange: ((sizing: ColumnSizingState) => void) | undefined,
): {
  columnSizing: ColumnSizingState;
  setColumnSize: (columnId: string, width: number) => void;
} {
  const [internal, setInternal] = useState<ColumnSizingState>({});
  const columnSizing = controlled ?? internal;
  const setColumnSize = useCallback(
    (columnId: string, width: number) => {
      const next = { ...columnSizing, [columnId]: Math.max(MIN_COLUMN_SIZE, Math.round(width)) };
      setInternal(next);
      onChange?.(next);
    },
    [columnSizing, onChange],
  );
  return { columnSizing, setColumnSize };
}
