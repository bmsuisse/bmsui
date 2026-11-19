import type { ColumnDef } from "../column/types";

/** One run of contiguous visible columns for the optional spanning header-group row. */
export type HeaderRun<TRow> =
  | { kind: "group"; label: string; columns: ColumnDef<TRow>[] }
  | { kind: "single"; column: ColumnDef<TRow> };

/**
 * Groups contiguous visible columns sharing the same `headerGroup` label
 * into `"group"` runs; every other column becomes its own `"single"` run —
 * see `BaseColumn.headerGroup`'s doc for why this is positional rather than
 * collecting every same-labeled column regardless of adjacency.
 */
export function computeHeaderRuns<TRow>(columns: ColumnDef<TRow>[]): HeaderRun<TRow>[] {
  const runs: HeaderRun<TRow>[] = [];
  for (const column of columns) {
    const last = runs[runs.length - 1];
    if (column.headerGroup && last?.kind === "group" && last.label === column.headerGroup) {
      last.columns.push(column);
    } else if (column.headerGroup) {
      runs.push({ kind: "group", label: column.headerGroup, columns: [column] });
    } else {
      runs.push({ kind: "single", column });
    }
  }
  return runs;
}
