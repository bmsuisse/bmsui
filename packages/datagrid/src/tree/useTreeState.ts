import { useCallback, useMemo, useState } from "react";
import type { TreeAccessors } from "./types";

export interface TreeStateController<TRow> {
  expanded: Record<string, boolean>;
  childrenMap: ReadonlyMap<string, TRow[]>;
  loadingIds: ReadonlySet<string>;
  /** Node id -> the message from its most recent failed `onLoadChildren` call. */
  errorIds: ReadonlyMap<string, string>;
  toggleExpand: (row: TRow) => void;
  /** Re-attempts `onLoadChildren` for a node currently in `errorIds`. */
  retry: (row: TRow) => void;
  /** Expands every node from the roots down to (but not including) `level`, fetching lazy children along the way. */
  expandToLevel: (level: number) => Promise<void>;
}

export interface UseTreeStateOptions<TRow> extends TreeAccessors<TRow> {
  data: TRow[];
  onLoadChildren?: (row: TRow) => Promise<TRow[]>;
  expanded?: Record<string, boolean>;
  onExpandedChange?: (expanded: Record<string, boolean>) => void;
}

/**
 * Owns everything `<TreeDataGrid>` needs beyond plain rendering: expand
 * state (controlled or internal, same pattern as `<ColumnSelector>`'s
 * `visibility`/`onVisibilityChange`), a per-node lazy-children cache, and
 * per-node loading/error tracking.
 *
 * Deliberately does NOT reset any of this when `data` changes identity —
 * unlike `ContractTreelist`, which resets `expanded`/`childrenMap` on every
 * filter change because filtering there reshapes the whole tree server-side.
 * This hook has no opinion on why `data` changed; a caller that wants a full
 * reset (e.g. switching to a different root entity entirely) should remount
 * `<TreeDataGrid>` via a `key` prop rather than rely on implicit magic here.
 */
export function useTreeState<TRow>({
  data,
  getRowId,
  getChildren,
  hasChildren,
  onLoadChildren,
  expanded: controlledExpanded,
  onExpandedChange,
}: UseTreeStateOptions<TRow>): TreeStateController<TRow> {
  const [internalExpanded, setInternalExpanded] = useState<Record<string, boolean>>({});
  const expanded = controlledExpanded ?? internalExpanded;

  const setExpanded = useCallback(
    (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      if (controlledExpanded) {
        onExpandedChange?.(updater(controlledExpanded));
      } else {
        setInternalExpanded(updater);
      }
    },
    [controlledExpanded, onExpandedChange],
  );

  const [childrenMap, setChildrenMap] = useState<Map<string, TRow[]>>(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Map<string, string>>(new Map());

  const resolveHasChildren = useMemo(
    () => hasChildren ?? ((row: TRow) => (getChildren(row)?.length ?? 0) > 0),
    [hasChildren, getChildren],
  );

  const loadChildrenFor = useCallback(
    async (row: TRow): Promise<TRow[]> => {
      const id = getRowId(row);
      const cached = childrenMap.get(id);
      if (cached) return cached;

      const eager = getChildren(row);
      if (eager && eager.length > 0) return eager;
      if (!onLoadChildren) return eager ?? [];

      setLoadingIds((prev) => new Set(prev).add(id));
      setErrorIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      try {
        const result = await onLoadChildren(row);
        setChildrenMap((prev) => new Map(prev).set(id, result));
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load children.";
        setErrorIds((prev) => new Map(prev).set(id, message));
        throw error;
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [childrenMap, getChildren, getRowId, onLoadChildren],
  );

  const toggleExpand = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      const willExpand = !expanded[id];
      setExpanded((prev) => ({ ...prev, [id]: willExpand }));
      // Fetch on the way open, never on the way closed — collapsing only
      // hides rows, it never drops the cache (see the module doc above).
      if (willExpand && resolveHasChildren(row)) {
        loadChildrenFor(row).catch(() => {
          // Deliberately swallowed: the failure is already surfaced via
          // `errorIds` (rendered inline with a retry affordance by
          // `<TreeDataGrid>`) — unlike `ContractTreelist`'s equivalent path
          // (`toggleExpand` -> `fetchChildrenFor` with no `.catch`), which
          // left an unhandled rejection and no visible error at all.
        });
      }
    },
    [expanded, getRowId, loadChildrenFor, resolveHasChildren, setExpanded],
  );

  const retry = useCallback(
    (row: TRow) => {
      loadChildrenFor(row).catch(() => {
        // Same reasoning as toggleExpand above.
      });
    },
    [loadChildrenFor],
  );

  const expandToLevel = useCallback(
    async (level: number): Promise<void> => {
      const nextExpanded: Record<string, boolean> = { ...expanded };

      async function visit(row: TRow, depth: number): Promise<void> {
        if (depth >= level || !resolveHasChildren(row)) return;
        nextExpanded[getRowId(row)] = true;
        let children: TRow[];
        try {
          children = await loadChildrenFor(row);
        } catch {
          // Leave this node expanded-but-empty; errorIds already has the
          // message and `<TreeDataGrid>` renders a retry affordance for it.
          return;
        }
        for (const child of children) await visit(child, depth + 1);
      }

      for (const root of data) await visit(root, 0);
      setExpanded(() => nextExpanded);
    },
    [data, expanded, getRowId, loadChildrenFor, resolveHasChildren, setExpanded],
  );

  return { expanded, childrenMap, loadingIds, errorIds, toggleExpand, retry, expandToLevel };
}
