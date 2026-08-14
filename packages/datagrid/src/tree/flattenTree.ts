import type { TreeAccessors } from "./types";

export interface FlatTreeRow<TRow> {
  row: TRow;
  id: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

/**
 * Depth-first flatten of `roots` into the currently *visible* rows only —
 * a collapsed node's descendants never enter the output at all, matching
 * `ContractTreelist`'s `flattenContractTree` (the function this generalizes).
 *
 * `childrenOverride` (a node id -> loaded children map) takes priority over
 * `getChildren(row)` when both exist, since it reflects the most recently
 * fetched batch for a lazily-loaded node — `getChildren` may still return a
 * stale/partial eager batch for the same node.
 */
export function flattenTree<TRow>(
  roots: TRow[],
  accessors: TreeAccessors<TRow>,
  expanded: Record<string, boolean>,
  childrenOverride: ReadonlyMap<string, TRow[]>,
): FlatTreeRow<TRow>[] {
  const { getRowId, getChildren } = accessors;
  const resolveHasChildren =
    accessors.hasChildren ?? ((row: TRow) => (getChildren(row)?.length ?? 0) > 0);
  const out: FlatTreeRow<TRow>[] = [];

  function visit(row: TRow, depth: number): void {
    const id = getRowId(row);
    const isExpanded = Boolean(expanded[id]);
    out.push({ row, id, depth, hasChildren: resolveHasChildren(row), isExpanded });
    if (!isExpanded) return;
    const children = childrenOverride.get(id) ?? getChildren(row) ?? [];
    for (const child of children) visit(child, depth + 1);
  }

  for (const root of roots) visit(root, 0);
  return out;
}
