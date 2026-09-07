import type { ColumnDef } from "../column/types";

/**
 * Reorders `columns` to match `order` (an array of column ids in display
 * order), then hands the result to `groupColumns` -- since that function
 * preserves each column's position within its own group, pre-sorting the
 * input array this way is enough to get correctly-ordered groups with no
 * change to `groupColumns` itself.
 *
 * An id in `order` that no longer matches a real column is ignored (e.g. a
 * column removed from the grid since the order was persisted); a column
 * present in `columns` but missing from `order` (e.g. one newly added since)
 * is appended at the end, in its original `columns` position -- the same
 * "graceful fallback for a stale persisted list" shape `readPersistedVisibility`
 * already uses for visibility.
 */
export function applyColumnOrder<TRow>(
  columns: readonly ColumnDef<TRow>[],
  order: readonly string[],
): ColumnDef<TRow>[] {
  const byId = new Map(columns.map((column) => [column.id, column] as const));
  const seen = new Set<string>();
  const ordered: ColumnDef<TRow>[] = [];

  for (const id of order) {
    const column = byId.get(id);
    if (column && !seen.has(id)) {
      ordered.push(column);
      seen.add(id);
    }
  }
  for (const column of columns) {
    if (!seen.has(column.id)) ordered.push(column);
  }
  return ordered;
}

/**
 * Moves `columnId` to sit immediately before `beforeColumnId` in `order` (or
 * to the end when `beforeColumnId` is undefined or no longer present) --
 * the pure reorder-array-splice logic behind `<ColumnSelector>`'s
 * drag-and-drop, kept separate from the DOM drag wiring so it's unit-testable
 * without simulating real drag events (jsdom has no working `DataTransfer`).
 * Recomputing `beforeColumnId`'s index AFTER removing `columnId` (rather than
 * the caller pre-computing an insert index) makes this correct regardless of
 * whether the drag moved the column earlier or later in the list.
 */
export function moveColumnBefore(
  order: readonly string[],
  columnId: string,
  beforeColumnId: string | undefined,
): string[] {
  const next = order.filter((id) => id !== columnId);
  const insertAt = beforeColumnId ? next.indexOf(beforeColumnId) : -1;
  if (insertAt === -1) next.push(columnId);
  else next.splice(insertAt, 0, columnId);
  return next;
}
