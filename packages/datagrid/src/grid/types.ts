import type { ColumnSizingState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { CellEditingOptions } from "../cell-editing/types";
import type { ColumnDef } from "../column/types";
import type { ColumnVisibility } from "../column-selector/types";
import type { EditingOptions } from "../edit/types";
import type { GridState } from "../filter/types";
import type { MenuItem } from "../menu/types";

/**
 * `"client"`: the grid owns filtering/sorting/pagination and evaluates them
 * in-memory against the full `data` array (via `evaluateFilter`).
 *
 * `"server"`: `data` is just the current page, already filtered/sorted by
 * the caller; the grid calls `onStateChange` on every sort/filter/page
 * change (debounced ~300ms for filter changes) and trusts the result — it
 * never re-filters/re-sorts server-mode data itself.
 */
export type DataSource<TRow> =
  | { mode: "client"; data: TRow[] }
  | {
      mode: "server";
      data: TRow[];
      rowCount: number;
      loading?: boolean;
      onStateChange: (state: GridState) => void;
    };

export interface DataGridVirtualizeOptions {
  /** Enables row virtualization once the row count exceeds this threshold. Defaults to 100. Set to 0 to always virtualize, or Infinity to never. */
  threshold?: number;
  /** Fixed row height estimate in pixels, used by the virtualizer. Defaults to 40. */
  estimatedRowHeight?: number;
  /** Max height of the scrollable table body in pixels. Required for virtualization to have a viewport to scroll within. Defaults to 480. */
  maxBodyHeight?: number;
  /** Extra rows rendered beyond the viewport on each side. Defaults to 10. */
  overscan?: number;
  /**
   * Called once when scrolling reaches the last currently loaded row — the
   * caller's job to fetch more and grow `dataSource.data`; `<DataGrid>`
   * doesn't own pagination state in this mode (works with `"client"` and
   * `"server"` `DataSource` alike, since it's purely about *rendering*, not
   * fetching). Won't fire again for the same `data` length — only once
   * `data` actually grows (or shrinks and regrows) does another scroll to
   * the end re-fire it.
   */
  onEndReached?: () => void;
  /** Whether more rows exist beyond what's currently loaded. `onEndReached` never fires while this is `false`. Defaults to `true`. */
  hasMore?: boolean;
}

export interface DataGridProps<TRow> {
  columns: ColumnDef<TRow>[];
  dataSource: DataSource<TRow>;
  getRowId: (row: TRow) => string;
  /**
   * Shows a full-overlay spinner over the grid's scrollable body, positioned as a
   * sibling of it (not a child) so it stays fixed over the visible viewport instead of
   * scrolling away with the table content. Independent of `dataSource.mode === "server"`'s
   * own `loading` flag (which only affects the empty-state text) — this works for
   * `"client"` mode too, for a caller whose own `data` array is still being fetched.
   * The two are OR'd together if both happen to be set. Defaults to `false`.
   */
  loading?: boolean;
  /** Per-row kebab menu. Evaluated with `ctx.row` set to that row. */
  rowActions?: MenuItem<TRow>[];
  /** Toolbar menu above the table. Evaluated with `ctx.selectedRows` set. */
  headerActions?: MenuItem<TRow>[];
  /** Allows shift-click to add a secondary sort column instead of replacing. Defaults to false. */
  enableMultiSort?: boolean;
  /** Initial sort/filter/page/pageSize, e.g. restored from a URL. Defaults to no filter, no sort, page 0, pageSize 20. Only read once, at mount — see `gridState` to push updates in afterward. */
  initialState?: Partial<GridState>;
  /**
   * Pushes a full `GridState` into the grid from outside, overriding
   * whatever it currently has — the one way to change sort/filter/page
   * programmatically after mount without remounting `<DataGrid>` (e.g. via
   * a changing `key`). Omit entirely for the grid to fully own its own
   * state, seeded once from `initialState`. Typical server-mode usage
   * mirrors every `dataSource.onStateChange` call into your own state and
   * passes that same value back in here — a fresh object literal recreated
   * on every render instead re-triggers this resync every render, so don't
   * inline a new one; pass the state variable you're already keeping in
   * sync from `onStateChange`. Like a controlled `<input>`: decide once
   * whether a given `<DataGrid>` is controlled this way and stay there for
   * its whole lifetime — toggling this to `undefined` later doesn't hand
   * control back, it just stops resyncing.
   */
  gridState?: GridState;
  /**
   * Controlled column visibility, e.g. driven by a `<ColumnSelector>` next
   * to the grid. Both must be supplied together to actually hide columns —
   * <DataGrid> never owns this state itself, matching how it never owns
   * GridState's persistence either.
   */
  columnVisibility?: ColumnVisibility;
  onColumnVisibilityChange?: (visibility: ColumnVisibility) => void;
  /**
   * Enables an expand/collapse chevron in a dedicated leftmost column; when
   * a row is expanded, its result is rendered directly below that row, in
   * its own full-width `<tr>`. Omit entirely to disable — no chevron column
   * renders at all. Multiple rows can be expanded simultaneously (there's
   * no single-row-at-a-time constraint). Combined with `virtualize`: only
   * the row's own height is dynamically measured, not the expanded detail
   * panel's — size `virtualize.estimatedRowHeight` generously if rows are
   * commonly expanded in a virtualized grid, or expect some visual overlap.
   */
  renderDetail?: (row: TRow) => ReactNode;
  /**
   * Enables row virtualization (`@tanstack/react-virtual`) once the row
   * count crosses `threshold`. Omit entirely for a plain, fully-rendered
   * `<table>` (the default) — most grids never need this; it's for the ones
   * with hundreds+ of rows where rendering every `<tr>` becomes the
   * bottleneck.
   */
  virtualize?: DataGridVirtualizeOptions;
  /**
   * Opt-in: defaults to false. When true, every column gets a drag handle
   * on its trailing edge to resize it, and every column (not just ones with
   * an explicit `width`) gets a concrete pixel width — TanStack Table's own
   * `size: 150` default for any column that doesn't set one, same as if you
   * typed `width: 150` yourself. That's an intentional trade of "natural,
   * content-driven column widths" for "every column resizable," so only
   * turn this on for a grid that actually needs manual column resizing.
   */
  enableColumnResizing?: boolean;
  /** `"onChange"` (default) commits width live while dragging; `"onEnd"` commits once on release. */
  columnResizeMode?: "onChange" | "onEnd";
  /**
   * Controlled column widths, e.g. persisted the same way `columnVisibility`
   * might be. Both must be supplied together to actually drive sizing —
   * omit both to let `<DataGrid>` manage resize state internally.
   */
  columnSizing?: ColumnSizingState;
  onColumnSizingChange?: (sizing: ColumnSizingState) => void;
  /**
   * Renders the built-in Previous/Next pagination footer. Defaults to true.
   * Set to false when a caller renders its own pagination UI instead (e.g.
   * one with specific `data-testid`s an existing test suite depends on) —
   * `<DataGrid>` itself never conditions any other behavior on this, it just
   * stops rendering that one footer.
   */
  showPagination?: boolean;
  /**
   * Controlled row selection, e.g. so a caller can build its own toolbar
   * (a bulk-export button, a "N selected" count) elsewhere on the page
   * instead of only reacting to selection via `headerActions`' `onSelect`
   * closure. Both must be supplied together to actually control it — omit
   * both to let `<DataGrid>` manage selection state internally (the
   * default, unchanged from before this existed).
   */
  selectedIds?: ReadonlySet<string>;
  onSelectedIdsChange?: (ids: ReadonlySet<string>) => void;
  /**
   * Extra props (className, onClick, data-* attributes, etc.) spread onto a
   * row's own `<tr>`. Applied AFTER `<DataGrid>`'s own `data-testid`/
   * `data-index`/`ref`, so those stay intact even if this returns keys that
   * would otherwise collide — use it to make a whole row clickable (an
   * `onClick` `<DataGrid>` has no other way to express — `rowActions` is a
   * kebab menu, not a row-wide click target), or to attach a `className`/
   * other `data-*` attribute an existing test suite already depends on. A
   * `data-testid` returned here specifically is NOT one of those — see
   * `getRowTestId` below for overriding that one. Typed
   * as a plain `Record` (not `HTMLAttributes<HTMLTableRowElement>`) since
   * that interface has no index signature — a return value with only
   * `data-*` keys and no standard HTML attributes would fail TypeScript's
   * "no properties in common" excess-property check against it.
   *
   * `onClick` specifically is safe to combine with `renderDetail`'s expand
   * chevron, a `rowActions` kebab, or `selectedIds`' checkbox — each of
   * those controls stops its own click from bubbling up to this `onClick`.
   * That guard only covers `click`, though: an `onMouseDown`/`onDoubleClick`/
   * `onContextMenu` returned here would still fire from inside any of those
   * controls too, since nothing stops those event types from bubbling.
   */
  getRowProps?: (row: TRow) => Record<string, unknown>;
  /**
   * Overrides the per-row `data-testid` (default `row-${getRowId(row)}`).
   * Note this is NOT something `getRowProps` above can do despite what its
   * own doc says about "a caller-specific data-testid" — `<DataGrid>` always
   * re-applies its own `data-testid` after spreading `getRowProps`'s result,
   * specifically so a colliding key there can't accidentally break e2e
   * selectors depending on the default `row-${id}` convention. Use this prop
   * instead when a consumer's existing test suite selects rows by a
   * different, entity-specific convention (e.g. `import-row-${id}`) that
   * predates adopting `<DataGrid>` — lets that suite need zero changes.
   */
  getRowTestId?: (row: TRow) => string;
  /**
   * `data-testid` for the table's own scrollable container (the element
   * `virtualize.maxBodyHeight` actually applies to, and — with or without
   * virtualization — the element horizontal overflow scrolls within). Omit
   * for no attribute at all. Useful for an e2e test that needs to scroll
   * this specific grid or assert on its scroll position; the outer
   * `data-testid="datagrid"` wrapper isn't it, and isn't unique per grid on
   * a page with more than one.
   */
  testId?: string;
  /**
   * Buckets the grid's already-filtered/sorted/paginated `rows` into groups,
   * rendering one full-width `colSpan`'d group-header row before each
   * bucket's own rows, in first-seen bucket order (rows are never re-sorted
   * to cluster a group together — the caller's own sort already determines
   * which key appears first). Single level only — no nested grouping, no
   * aggregate/summary calculation; a caller wanting a subtotal computes it
   * themselves in `renderGroupHeader` off that bucket's own row array.
   * Operates on whatever `rows` already resolved to — i.e. the current page,
   * if paginated — with no special-casing; pair with a large `pageSize`/
   * `showPagination: false` if a group's full membership should never be
   * split across pages. Omit entirely to disable — no grouping, no header
   * rows, unchanged default rendering.
   *
   * Composes with `virtualize` — header rows and member rows are flattened
   * into one virtualizable list together, so a large grouped dataset windows
   * the same way an ungrouped one does. `virtualize.threshold` still gates
   * on the real row count (`groupBy`'s synthetic header entries never push a
   * grid over a threshold its actual data didn't cross), and
   * `virtualize.onEndReached`'s own "won't fire again for the same data"
   * dedup is keyed off that same real row count too — a pure expand/collapse
   * click, with no new data loaded, never re-fires it.
   *
   * Two gaps this doesn't close, both pre-existing/out of scope for this
   * pass rather than introduced by composing with `virtualize`: `zebra`'s
   * odd/even striping is keyed off a row's position in the flat, ungrouped
   * row list, not its rendered position within its own bucket, so grouped
   * rows can stripe unevenly (`groupBy` alone already had this, virtualizing
   * doesn't fix or worsen it); and a sticky group header stays pinned below
   * the real `<thead>` only while its own `<tbody>` (or one of its member
   * rows') is actually mounted in the virtualized window — scrolling deep
   * into one bucket whose row count itself exceeds `virtualize`'s overscan
   * will eventually unmount that bucket's header and let it scroll away
   * rather than staying pinned, since `position: sticky` needs the element
   * mounted to stick at all. Both are harmless for the common case (buckets
   * no bigger than a couple dozen rows); see AGENTS.md's "Known limitations"
   * for the full writeup.
   */
  groupBy?: (row: TRow) => string;
  /** Customizes a group-header row's content. Defaults to `` `${key} (${rows.length})` ``. */
  renderGroupHeader?: (key: string, rows: TRow[], expanded: boolean) => ReactNode;
  /** Whether a newly-seen group starts expanded. Defaults to true. */
  defaultGroupsExpanded?: boolean;
  /**
   * Controlled per-group expand/collapse state, keyed by the `groupBy` key.
   * Both must be supplied together to control it — omit both for
   * `<DataGrid>` to own this state internally.
   */
  expandedGroups?: Record<string, boolean>;
  onExpandedGroupsChange?: (expanded: Record<string, boolean>) => void;
  /** Alternates body row backgrounds for readability on wide/dense tables. Defaults to true. */
  zebra?: boolean;
  /**
   * Enables the built-in inline-editing workflow: any column with
   * `editable` set renders as an interactive editor, edits accumulate
   * locally, and a Save/Discard bar appears above the grid once at least
   * one exists. Omit entirely to disable — every `editable` column then
   * just falls back to its normal static `cell`/`defaultFormat` rendering,
   * same as if `editable` were never set. See `EditingOptions` for the full
   * contract — shared with `<TreeDataGrid>`'s own `editing` prop.
   */
  editing?: EditingOptions<TRow>;
  /**
   * Enables the "true spreadsheet" cell-editing mode: click/type directly
   * into any cell, drag or shift+arrow to range-select, paste, drag a
   * fill-handle — every change applies immediately, with no row-level
   * Save/Discard gate. This is a different, mutually exclusive state machine
   * from `editing` above, not a superset of it — set at most one of the two
   * on a given `<DataGrid>`; `editing` is ignored once `cellEditing` is set.
   * See `CellEditingOptions` for the full contract.
   */
  cellEditing?: CellEditingOptions<TRow>;
}
