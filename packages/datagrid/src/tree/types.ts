import type { ColumnDef } from "../column/types";
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
}
