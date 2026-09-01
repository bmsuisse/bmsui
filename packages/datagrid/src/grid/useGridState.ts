import { useCallback, useEffect, useMemo, useState } from "react";
import type { FilterDescriptor, GridState, SortDescriptor } from "../filter/types";
import { fieldKey } from "../filter/types";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import type { DataSource } from "./types";

const DEFAULT_STATE: GridState = { filter: null, sort: [], page: 0, pageSize: 20 };
const FILTER_CHANGE_DEBOUNCE_MS = 300;

export interface GridStateController {
  state: GridState;
  /** Per-column FilterDescriptor, keyed by column id. */
  filtersByColumn: ReadonlyMap<string, FilterDescriptor>;
  setColumnFilter: (columnId: string, next: FilterDescriptor | undefined) => void;
  /**
   * Cycles a column's sort: none -> asc -> desc -> none, or none -> desc -> asc -> none
   * when `descFirst` is true (see `BaseColumn.sortDescFirst`) — for a column whose
   * "interesting" direction is descending (revenue, risk scores, backlog), so a first
   * click surfaces the highest/most-urgent values instead of the lowest/safest ones.
   * Adds/replaces per `enableMultiSort`.
   */
  toggleSort: (columnId: string, additive: boolean, descFirst?: boolean) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
}

function nextSortDir(
  current: SortDescriptor["dir"] | undefined,
  descFirst: boolean,
): SortDescriptor["dir"] | undefined {
  const [first, second] = descFirst ? (["desc", "asc"] as const) : (["asc", "desc"] as const);
  if (current === undefined) return first;
  if (current === first) return second;
  return undefined;
}

/**
 * Owns `GridState` (filter/sort/page/pageSize) for `<DataGrid>` and, in
 * `"server"` mode, calls `dataSource.onStateChange` on every change —
 * debounced ~300ms for filter changes (typing), immediately for sort/page
 * changes. In `"client"` mode `onStateChange` doesn't exist and is never
 * called; the grid re-filters/re-sorts the in-memory array itself instead.
 *
 * Deliberately takes no `columns` and enforces no `sortable`/`filterable`
 * policy itself — `toggleSort`/`setColumnFilter` will happily act on any
 * column id passed to them. `<DataGrid>` is the only place that consults
 * `isSortable`/`isFilterable` (in its rendered header, gating the sort
 * button's `onClick` and whether a filter icon renders at all), because this
 * hook is a generic state container, not a per-column-policy enforcer. A
 * caller that imports this hook directly (bypassing <DataGrid>'s UI
 * entirely) is responsible for applying that same policy itself before
 * calling these setters, the same way it's responsible for its own markup.
 *
 * `externalState`, when given (from the very first render on), makes this
 * fully caller-controlled: whenever it changes identity, internal `state`
 * is overwritten to match (restoring a saved filter, clearing everything at
 * once, applying a URL-restored state — all without remounting
 * `<DataGrid>`). Pass the *same* value back in that a server-mode
 * `dataSource.onStateChange` call just handed you (mirror it into your own
 * state and pass that straight through) — a fresh object literal recreated
 * every render re-triggers this resync every render too. Like a controlled
 * `<input>`, don't switch between passing `externalState` and omitting it
 * across the component's lifetime — start controlled and stay controlled,
 * or start uncontrolled and stay uncontrolled; toggling to `undefined`
 * later does not hand ownership back, it just stops resyncing.
 *
 * `showPagination`, when `false` and the caller did NOT explicitly provide
 * `initialState.pageSize`, seeds `pageSize` as effectively unbounded instead
 * of `DEFAULT_STATE`'s 20 — "hide the pagination controls" means "no
 * pagination" by default, matching `<DataGrid>`'s `showPagination` doc. A
 * caller who explicitly sets `initialState.pageSize` (deliberate fixed-size
 * chunking with no UI, alongside `showPagination: false`) still gets exactly
 * that value; this only changes what happens when they didn't ask for a
 * particular page size at all. Has no effect once `externalState` is in
 * play — a controlled `GridState` is always fully caller-specified.
 */
export function useGridState<TRow>(
  dataSource: DataSource<TRow>,
  initialState?: Partial<GridState>,
  externalState?: GridState,
  showPagination = true,
): GridStateController {
  const [state, setState] = useState<GridState>(() => {
    if (externalState) return externalState;
    const pageSize =
      initialState?.pageSize ?? (showPagination ? DEFAULT_STATE.pageSize : Number.MAX_SAFE_INTEGER);
    return { ...DEFAULT_STATE, ...initialState, pageSize };
  });

  const notifyRaw = useCallback(
    (next: GridState) => {
      if (dataSource.mode === "server") dataSource.onStateChange(next);
    },
    [dataSource],
  );
  const { run: notifyDebounced, cancel: cancelDebouncedNotify } = useDebouncedCallback(
    notifyRaw,
    FILTER_CHANGE_DEBOUNCE_MS,
  );

  // Sort/page changes must cancel any pending debounced filter notification
  // first — otherwise a filter edit made just before a sort/page click
  // schedules a notify that fires ~300ms later with its own (now stale)
  // captured state, silently overwriting the immediate sort/page change the
  // caller already received and acted on.
  const notifyNow = useCallback(
    (next: GridState) => {
      cancelDebouncedNotify();
      notifyRaw(next);
    },
    [notifyRaw, cancelDebouncedNotify],
  );

  // Pushing a new `externalState` must cancel any pending debounced filter
  // notification the same way notifyNow does for sort/page — otherwise a
  // filter edit made just before the push schedules a notify that fires
  // ~300ms later with its own (now stale) captured state. If the caller
  // mirrors that stale notify back into whatever it passes as
  // `externalState` (the exact two-way pattern this hook's own doc
  // recommends), it would silently resurrect the state this push just
  // overwrote.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see externalState's own doc above: intentionally only resyncs when its *identity* changes, not on every render.
  useEffect(() => {
    if (!externalState) return;
    cancelDebouncedNotify();
    setState(externalState);
  }, [externalState, cancelDebouncedNotify]);

  const filtersByColumn = useMemo(() => {
    const map = new Map<string, FilterDescriptor>();
    for (const child of state.filter?.filters ?? []) {
      if ("operator" in child) map.set(fieldKey(child.field), child);
    }
    return map;
  }, [state.filter]);

  /**
   * Replaces (or clears) one column's filter and combines every column's
   * current filter with AND — this is the entire filtering model the grid's
   * built-in per-column widgets implement, by design: one FilterDescriptor
   * per filterable column, ANDed together.
   *
   * `GridState.filter` is typed as a general `CompositeFilterDescriptor`
   * (supporting arbitrary AND/OR nesting) because the *type* is shared with
   * server-side consumers (sql.py/meili.py) and custom filter UIs that want
   * to build more elaborate queries. But if `initialState.filter` arrives
   * with `logic: "or"` (or any nesting beyond flat per-column leaves), the
   * very next edit through a built-in filter widget rewrites it flat as
   * `{ logic: "and", filters: [...] }`, silently discarding that structure.
   * Supporting arbitrary boolean composition in the built-in widgets would
   * require a genuinely different UI (a query builder), which is out of
   * scope here — this is a known, accepted limitation of the column-scoped
   * filtering model, not an oversight.
   */
  const setColumnFilter = useCallback(
    (columnId: string, next: FilterDescriptor | undefined) => {
      setState((prev) => {
        const remaining = (prev.filter?.filters ?? []).filter(
          (f) => !("operator" in f) || fieldKey(f.field) !== columnId,
        );
        const filters = next ? [...remaining, next] : remaining;
        const nextState: GridState = {
          ...prev,
          filter: filters.length > 0 ? { logic: "and", filters } : null,
          page: 0,
        };
        notifyDebounced(nextState);
        return nextState;
      });
    },
    [notifyDebounced],
  );

  const toggleSort = useCallback(
    (columnId: string, additive: boolean, descFirst = false) => {
      setState((prev) => {
        const existing = prev.sort.find((s) => s.field === columnId);
        const dir = nextSortDir(existing?.dir, descFirst);
        const withoutColumn = prev.sort.filter((s) => s.field !== columnId);
        const base = additive ? withoutColumn : [];
        const sort = dir ? [...base, { field: columnId, dir }] : base;
        const nextState: GridState = { ...prev, sort };
        notifyNow(nextState);
        return nextState;
      });
    },
    [notifyNow],
  );

  const setPage = useCallback(
    (page: number) => {
      setState((prev) => {
        const nextState: GridState = { ...prev, page };
        notifyNow(nextState);
        return nextState;
      });
    },
    [notifyNow],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      setState((prev) => {
        const nextState: GridState = { ...prev, pageSize, page: 0 };
        notifyNow(nextState);
        return nextState;
      });
    },
    [notifyNow],
  );

  return { state, filtersByColumn, setColumnFilter, toggleSort, setPage, setPageSize };
}
