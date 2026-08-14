import type { ColumnDef } from "../column/types";
import type { ColumnVisibility } from "./types";

/** A missing key means visible, matching TanStack's own VisibilityState convention. */
export function isColumnVisible(visibility: ColumnVisibility, columnId: string): boolean {
  return visibility[columnId] !== false;
}

/** How many of `columns` are currently visible under `visibility`. */
export function countVisible<TRow>(
  columns: readonly ColumnDef<TRow>[],
  visibility: ColumnVisibility,
): number {
  return columns.filter((column) => isColumnVisible(visibility, column.id)).length;
}

export interface ColumnGroup<TRow> {
  /** undefined for the ungrouped section, which is always listed first. */
  group: string | undefined;
  columns: ColumnDef<TRow>[];
}

/**
 * Groups columns by `column.group`, preserving each group's first-seen order
 * and each column's original order within its group. The ungrouped section
 * (columns with no `group`) is always returned first, regardless of where
 * ungrouped columns actually fall in the input order.
 */
export function groupColumns<TRow>(columns: readonly ColumnDef<TRow>[]): ColumnGroup<TRow>[] {
  const ungrouped: ColumnDef<TRow>[] = [];
  const named = new Map<string, ColumnDef<TRow>[]>();

  for (const column of columns) {
    if (column.group === undefined) {
      ungrouped.push(column);
      continue;
    }
    const bucket = named.get(column.group);
    if (bucket) bucket.push(column);
    else named.set(column.group, [column]);
  }

  const result: ColumnGroup<TRow>[] = [];
  if (ungrouped.length > 0) result.push({ group: undefined, columns: ungrouped });
  for (const [group, groupedColumns] of named) result.push({ group, columns: groupedColumns });
  return result;
}

/** Whether toggling `columnId` off is currently allowed (must leave at least one column visible). */
export function canHideColumn<TRow>(
  columns: readonly ColumnDef<TRow>[],
  visibility: ColumnVisibility,
  columnId: string,
): boolean {
  if (!isColumnVisible(visibility, columnId)) return true; // already hidden; "hiding" it again is a no-op
  return countVisible(columns, visibility) > 1;
}

/** Whether hiding every column in `groupColumnIds` at once is currently allowed. */
export function canHideGroup<TRow>(
  columns: readonly ColumnDef<TRow>[],
  visibility: ColumnVisibility,
  groupColumnIds: readonly string[],
): boolean {
  const groupIds = new Set(groupColumnIds);
  const visibleOutsideGroup = columns.filter(
    (column) => !groupIds.has(column.id) && isColumnVisible(visibility, column.id),
  ).length;
  return visibleOutsideGroup > 0;
}
