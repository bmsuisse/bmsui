import { useCallback, useMemo, useState } from "react";
import type { ColumnSizingState } from "@tanstack/react-table";
import { readPersistedColumnSizing, writePersistedColumnSizing } from "../column-selector/persistence";
import { MIN_COLUMN_SIZE } from "./useColumnSizing";

interface SizedColumn {
  id: string;
  width?: number;
}

/**
 * Folds a grid's full column sizing back into overrides: a column dragged
 * back to its default `width` drops out, and overrides of columns not in
 * `next` (currently hidden ones) are kept. A column without a `width` (absent
 * from `defaults`) keeps its override at any size: dropping it would turn the
 * column flexible again mid-drag and un-fix the table width.
 */
export function mergeSizing(
  overrides: ColumnSizingState,
  next: ColumnSizingState,
  defaults: ColumnSizingState,
): ColumnSizingState {
  const merged = { ...overrides };
  for (const [id, raw] of Object.entries(next)) {
    const width = Math.max(MIN_COLUMN_SIZE, Math.round(raw));
    if (width === defaults[id]) delete merged[id];
    else merged[id] = width;
  }
  return merged;
}

export interface PersistedColumnSizing {
  /** The user's overrides only — pass straight to a grid's `columnSizing`. */
  columnSizing: ColumnSizingState;
  onColumnSizingChange: (sizing: ColumnSizingState) => void;
  /** Drops every override and the stored entry. */
  reset: () => void;
  /** At least one column differs from its default width. */
  isCustomized: boolean;
}

/**
 * Column widths restored from localStorage on mount and saved on every change,
 * for either grid's controlled `columnSizing`/`onColumnSizingChange`. Only
 * overrides are stored, so a column the user never touched keeps following
 * its default `width` when that changes in code.
 */
export function usePersistedColumnSizing(
  persistKey: string,
  columns: readonly SizedColumn[],
): PersistedColumnSizing {
  // ponytail: read once on mount; a changing persistKey needs a remount (`key`).
  const [overrides, setOverrides] = useState<ColumnSizingState>(() => readPersistedColumnSizing(persistKey));
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        columns.flatMap((column) => (column.width === undefined ? [] : [[column.id, column.width]])),
      ),
    [columns],
  );

  const onColumnSizingChange = useCallback(
    (next: ColumnSizingState) => {
      const merged = mergeSizing(overrides, next, defaults);
      setOverrides(merged);
      writePersistedColumnSizing(persistKey, merged);
    },
    [overrides, persistKey, defaults],
  );
  const reset = useCallback(() => {
    setOverrides({});
    writePersistedColumnSizing(persistKey, {});
  }, [persistKey]);

  return { columnSizing: overrides, onColumnSizingChange, reset, isCustomized: Object.keys(overrides).length > 0 };
}
