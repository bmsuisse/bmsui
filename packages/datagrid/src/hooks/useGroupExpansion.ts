import { useCallback, useState } from "react";

export interface GroupExpansionController {
  /** The resolved (controlled-or-internal) expand state, keyed by group key. */
  expandedGroups: Record<string, boolean>;
  /** A key absent from `expandedGroups` (a group never toggled since it was first seen) falls back to `defaultGroupsExpanded`, not `false`. */
  isGroupExpanded: (key: string) => boolean;
  toggleGroupExpanded: (key: string) => void;
}

/**
 * Same controlled/uncontrolled pattern as `<DataGrid>`'s/`<TreeDataGrid>`'s
 * own `selectedIds`/`columnSizing`: both `controlledExpandedGroups` and
 * `onExpandedGroupsChange` must be supplied together to actually control
 * this state — omit both to let this hook own it internally. Shared between
 * the two grids' `groupBy` support so a fix to the fallback/toggle logic
 * never has to be made twice.
 *
 * `isGroupExpanded`/`toggleGroupExpanded` are stable (`useCallback`-wrapped)
 * across renders as long as `expandedGroups`/`defaultGroupsExpanded`/
 * `onExpandedGroupsChange` don't change — callers can safely list them in a
 * `useMemo`/`useEffect` dependency array without defeating memoization.
 */
export function useGroupExpansion(
  defaultGroupsExpanded: boolean,
  controlledExpandedGroups: Record<string, boolean> | undefined,
  onExpandedGroupsChange: ((expanded: Record<string, boolean>) => void) | undefined,
): GroupExpansionController {
  const [internalExpandedGroups, setInternalExpandedGroups] = useState<Record<string, boolean>>({});
  const expandedGroups = controlledExpandedGroups ?? internalExpandedGroups;

  const updateExpandedGroups = useCallback(
    (next: Record<string, boolean>): void => {
      setInternalExpandedGroups(next);
      onExpandedGroupsChange?.(next);
    },
    [onExpandedGroupsChange],
  );

  const isGroupExpanded = useCallback(
    (key: string): boolean => expandedGroups[key] ?? defaultGroupsExpanded,
    [expandedGroups, defaultGroupsExpanded],
  );

  const toggleGroupExpanded = useCallback(
    (key: string): void => {
      updateExpandedGroups({ ...expandedGroups, [key]: !isGroupExpanded(key) });
    },
    [expandedGroups, isGroupExpanded, updateExpandedGroups],
  );

  return { expandedGroups, isGroupExpanded, toggleGroupExpanded };
}
