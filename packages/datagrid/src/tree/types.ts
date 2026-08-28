import type { ReactNode } from "react";
import type { ColumnDef } from "../column/types";
import type { ColumnVisibility } from "../column-selector/types";
import type { EditingOptions } from "../edit/types";
import type { MenuItem } from "../menu/types";

/**
 * Accessor-based node shape, matching `<DataGrid>`'s `getRowId` convention
 * rather than requiring `TRow` to carry specific field names.
 *
 * `hasChildren` and `getChildren` are deliberately independent, mirroring
 * a consuming app's contract tree model (`has_children: boolean` distinct
 * from an optional `children` array): a node can know it *has* children the backend
 * hasn't sent yet. A node only needs lazy-loading (`onLoadChildren` gets
 * called) when `hasChildren(row)` is true AND `getChildren(row)` returns
 * nothing usable yet.
 */
export interface TreeAccessors<TRow> {
  getRowId: (row: TRow) => string;
  /** Already-loaded children, if any — from eager data or a prior `onLoadChildren` call. */
  getChildren: (row: TRow) => TRow[] | undefined;
  /**
   * Whether this node has children at all, independent of whether they're
   * loaded yet. Defaults to `(row) => (getChildren(row)?.length ?? 0) > 0`
   * when omitted — i.e. purely eager trees (no lazy loading) don't need to
   * supply this.
   */
  hasChildren?: (row: TRow) => boolean;
}

export interface TreeDataGridProps<TRow> extends TreeAccessors<TRow> {
  columns: ColumnDef<TRow>[];
  /** Root-level rows. */
  data: TRow[];
  /**
   * The column whose cell gets the depth indentation + expand/collapse
   * chevron prepended. Defaults to the first column in `columns`.
   */
  treeColumnId?: string;
  /**
   * Controlled column visibility, e.g. driven by a `<ColumnSelector>` next
   * to the grid — same convention as `<DataGrid>`'s own `columnVisibility`.
   * `<TreeDataGrid>` never owns this state itself; omit to render every
   * column in `columns`. Note that hiding `treeColumnId` itself (or the
   * first column, when `treeColumnId` is omitted) hides the indentation/
   * expand-collapse chevron along with it, since those are only ever
   * attached to that one column's cell.
   */
  columnVisibility?: ColumnVisibility;
  /**
   * Fetches a node's children on demand. Omit this entirely for a fully
   * eager tree (all children already present via `getChildren`) — a node
   * with `hasChildren(row)` true but no `onLoadChildren` is treated as a
   * dead end (chevron renders, but expanding it just shows "No children.").
   * Results are cached per node id for the component's lifetime: collapsing
   * and re-expanding a node never refetches.
   */
  onLoadChildren?: (row: TRow) => Promise<TRow[]>;
  /** How many levels to auto-expand on first render (0 = collapsed root only). Defaults to 0. */
  initialExpandedLevel?: number;
  /** Controlled expanded state, keyed by node id. Omit for the grid to own this itself. */
  expanded?: Record<string, boolean>;
  onExpandedChange?: (expanded: Record<string, boolean>) => void;
  /**
   * Controlled lazy-children cache, keyed by node id — same
   * controlled/uncontrolled convention as `expanded` above. Omit for the
   * grid to own this itself (the common case, and the only way earlier
   * versions of this component worked).
   *
   * Supply this when a caller needs to force a specific node's cached batch
   * to be replaced with fresher data fetched *outside* the normal
   * expand/collapse flow above (`onLoadChildren` only ever runs once per
   * node id per the doc on it) — e.g. after an edit made to one of that
   * node's children was saved, and the caller re-fetched that batch via its
   * own `onLoadChildren` function to pick up the server's new state. Setting
   * `childrenMap` to a new map containing that node's id (typically via
   * `onChildrenMapChange`'s own setter, called by the caller's re-fetch
   * logic) makes this component's flattened rows use the fresh batch on the
   * very next render — without this, a caller's own separate copy of that
   * data has nowhere to feed back into what actually gets rendered, no
   * matter how it's refreshed, since only this component's internal cache
   * (or an eager `getChildren(row)`) is ever consulted for a lazily-loaded
   * node's children.
   */
  childrenMap?: ReadonlyMap<string, TRow[]>;
  onChildrenMapChange?: (childrenMap: ReadonlyMap<string, TRow[]>) => void;
  /** Pixels of left padding added per depth level to the tree column's cell. Defaults to 20. */
  indentSize?: number;
  /**
   * Extra props (className, onClick, data-* attributes, etc.) spread onto a
   * row's own `<tr>`. Applied AFTER `<TreeDataGrid>`'s own `data-testid`/
   * `ref`, so those stay intact even if this returns keys that would
   * otherwise collide — use it to make a whole row clickable (an `onClick`
   * `<TreeDataGrid>` has no other way to express — `rowActions` is a kebab
   * menu, not a row-wide click target), or to attach a `className`/other
   * `data-*` attribute an existing test suite already depends on. A
   * `data-testid` returned here specifically is NOT one of those — see
   * `getRowTestId` below for overriding that one. `depth` and `index` are
   * the row's tree depth and its position among the currently visible
   * (flattened) rows, e.g. for depth-aware indentation or index-aware
   * striping. Typed as a plain `Record` (not `HTMLAttributes<HTMLTableRowElement>`)
   * since that interface has no index signature — a return value with only
   * `data-*` keys and no standard HTML attributes would fail TypeScript's
   * "no properties in common" excess-property check against it.
   *
   * `onClick` specifically is safe to combine with the expand/collapse
   * chevron or a `rowActions` kebab — each of those controls stops its own
   * click from bubbling up to this `onClick`. That guard only covers
   * `click`, though: an `onMouseDown`/`onDoubleClick`/`onContextMenu`
   * returned here would still fire from inside either control too, since
   * nothing stops those event types from bubbling.
   */
  getRowProps?: (row: TRow, depth: number, index: number) => Record<string, unknown>;
  /**
   * Overrides the per-row `data-testid` (default `tree-row-${getRowId(row)}`).
   * Note this is NOT something `getRowProps` above can do despite what its
   * own doc says about "a caller-specific data-testid" — `<TreeDataGrid>`
   * always re-applies its own `data-testid` after spreading `getRowProps`'s
   * result, specifically so a colliding key there can't accidentally break
   * e2e selectors depending on the default convention. Use this prop instead
   * when a consumer's existing test suite selects rows by a different,
   * entity-specific convention that predates adopting `<TreeDataGrid>`.
   */
  getRowTestId?: (row: TRow) => string;
  /** Per-row kebab menu — same `MenuItem` contract as `<DataGrid>`'s `rowActions`. */
  rowActions?: MenuItem<TRow>[];
  /**
   * Enables row virtualization once the flattened (visible) row count
   * exceeds this threshold. Defaults to 100 — small trees just render every
   * row directly (simpler DOM, no virtualizer overhead); large/deep trees
   * switch to `@tanstack/react-virtual`. Set to `0` to always virtualize, or
   * `Infinity` to never.
   */
  virtualizeThreshold?: number;
  /** Fixed row height estimate in pixels, used by the virtualizer. Defaults to 40. */
  estimatedRowHeight?: number;
  /** Max height of the scrollable table body in pixels. Required for virtualization to have a viewport to scroll within. Defaults to 480. */
  maxBodyHeight?: number;
  /**
   * Controlled row selection — same convention as `<DataGrid>`'s own
   * `selectedIds`/`onSelectedIdsChange`. Both must be supplied together to
   * render a checkbox column at all; there is no internal/uncontrolled
   * fallback here, unlike `<DataGrid>` — `<TreeDataGrid>` has no
   * `headerActions` bulk-toolbar concept that would need selection state
   * even without external control, so there's nothing for an uncontrolled
   * default to serve.
   *
   * Clicking a row's checkbox always toggles exactly that row's own id in
   * this set — never its children or parent. Any cascade ("select whole
   * group" / "select all descendants") is the caller's job, done by
   * recomputing the desired final set inside `onSelectedIdsChange` before
   * committing it to their own state.
   */
  selectedIds?: ReadonlySet<string>;
  onSelectedIdsChange?: (ids: ReadonlySet<string>) => void;
  /**
   * Fully overrides a row's checked/indeterminate display, replacing the
   * default derivation below. Needed for selection semantics this component
   * won't build in — e.g. a "select whole group vs. split into individual
   * children once loaded" cascade, where a parent should read as checked
   * even though not every descendant id is literally in `selectedIds`.
   * Return `undefined` for a given row to fall back to the default
   * derivation for just that row.
   *
   * Omitted (the default): `checked` is exactly `selectedIds.has(getRowId(row))`
   * — `selectedIds` always stays the single source of truth for "is this id
   * selected." `indeterminate` is true only when the row itself isn't
   * checked but at least one *currently loaded* descendant (recursively, via
   * the same `getChildren`/`onLoadChildren` cache this component already
   * maintains) is checked or itself indeterminate. A selected descendant
   * hidden behind a node that's never been expanded (so its children were
   * never fetched) can't be inspected — that ancestor reads as unchecked,
   * not indeterminate, until the fetch happens.
   */
  getRowSelectionState?: (row: TRow) => { checked: boolean; indeterminate?: boolean } | undefined;
  /** Disables just the checkbox for a specific row. Defaults to `() => false`. */
  isRowSelectionDisabled?: (row: TRow) => boolean;
  /**
   * Buckets the *root-level* rows in `data` into groups, rendering one
   * full-width `colSpan`'d group-header row before each bucket's own
   * (recursively flattened, depth-first) rows — same convention as
   * `<DataGrid>`'s own `groupBy`. Single level only, and only ever applied
   * to roots: a node's children are never split across groups from their
   * parent, since grouping an already-hierarchical tree by anything other
   * than "which root it belongs to" wouldn't have a sensible rendering.
   * Groups appear in first-seen bucket order — roots are never re-sorted to
   * cluster a group together. Omit entirely to disable — no grouping, no
   * header rows, unchanged default rendering.
   *
   * Not supported together with virtualization — when both are set,
   * virtualization is silently disabled and the tree renders as a plain,
   * fully-rendered (but still grouped) `<table>` instead, same limitation
   * `<DataGrid>` has.
   */
  groupBy?: (row: TRow) => string;
  /** Customizes a group-header row's content. Defaults to `` `${key} (${rootCount})` `` — `rootCount` counts only that group's root rows, not their descendants. */
  renderGroupHeader?: (key: string, roots: TRow[], expanded: boolean) => ReactNode;
  /** Whether a newly-seen group starts expanded. Defaults to true. */
  defaultGroupsExpanded?: boolean;
  /**
   * Controlled per-group expand/collapse state, keyed by the `groupBy` key.
   * Both must be supplied together to control it — omit both for
   * `<TreeDataGrid>` to own this state internally.
   */
  expandedGroups?: Record<string, boolean>;
  onExpandedGroupsChange?: (expanded: Record<string, boolean>) => void;
  /** Alternates body row backgrounds for readability on wide/dense tables. Defaults to true. */
  zebra?: boolean;
  /**
   * Enables the same built-in inline-editing workflow `<DataGrid>` has:
   * any column with `editable` set renders as an interactive editor
   * (clicking one editable cell activates every editable column in that
   * row, one row active at a time), edits accumulate locally, and a
   * Save/Discard bar appears above the tree once at least one exists. Omit
   * entirely to disable — every `editable` column then just falls back to
   * its normal static `cell`/`defaultFormat` rendering, same as if
   * `editable` were never set. See `EditingOptions` (shared with
   * `<DataGrid>`) for the full contract.
   */
  editing?: EditingOptions<TRow>;
}
