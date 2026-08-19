import type { TreeAccessors } from "./types";

export interface RowSelectionState {
  checked: boolean;
  indeterminate: boolean;
}

/**
 * Bottom-up walk over the *whole loaded* tree (`roots` + `childrenOverride`),
 * not just the currently visible/expanded rows — a collapsed parent can
 * still be indeterminate based on children loaded during an earlier
 * expand-then-collapse (per `useTreeState`'s "no implicit reset" cache),
 * which `flattenTree`'s collapse-stopping walk deliberately never visits.
 *
 * `checked` is always exactly `selectedIds.has(id)` — never auto-derived,
 * so `selectedIds` stays the single source of truth for "is this id
 * selected" (see `TreeDataGridProps.getRowSelectionState`'s doc for why).
 * `indeterminate` is derived: true when the row itself isn't checked but at
 * least one loaded descendant is checked or itself indeterminate. An
 * unloaded/unexpanded subtree can't be inspected, so it reads as neither.
 */
export function computeSelectionStates<TRow>(
  roots: TRow[],
  accessors: TreeAccessors<TRow>,
  childrenOverride: ReadonlyMap<string, TRow[]>,
  selectedIds: ReadonlySet<string>,
): Map<string, RowSelectionState> {
  const { getRowId, getChildren } = accessors;
  const out = new Map<string, RowSelectionState>();

  function visit(row: TRow): RowSelectionState {
    const id = getRowId(row);
    if (selectedIds.has(id)) {
      const state: RowSelectionState = { checked: true, indeterminate: false };
      out.set(id, state);
      return state;
    }
    const children = childrenOverride.get(id) ?? getChildren(row) ?? [];
    let anySelectedOrIndeterminate = false;
    for (const child of children) {
      const childState = visit(child);
      if (childState.checked || childState.indeterminate) anySelectedOrIndeterminate = true;
    }
    const state: RowSelectionState = { checked: false, indeterminate: anySelectedOrIndeterminate };
    out.set(id, state);
    return state;
  }

  for (const root of roots) visit(root);
  return out;
}
