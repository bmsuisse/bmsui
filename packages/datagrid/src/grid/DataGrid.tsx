import { BarsArrowDownIcon, BarsArrowUpIcon, FunnelIcon } from "@heroicons/react/24/outline";
import type { CellContext, ColumnDef as TanstackColumnDef, ColumnSizingState, RowData } from "@tanstack/react-table";
import { columnResizingFeature, columnSizingFeature, flexRender, tableFeatures, useTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, Loader2 } from "lucide-react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { alignClassName, defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { getColumnValue, isFilterable, isSortable } from "../column/types";
import { isColumnVisible } from "../column-selector/visibility";
import { Button } from "../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { renderDefaultFilterWidget } from "../filter/registry";
import type { FilterDescriptor } from "../filter/types";
import { cn, stopRowClick } from "../lib/utils";
import { SELECTION_COLUMN_WIDTH } from "../lib/structuralColumns";
import { ActionsMenu } from "../menu/ActionsMenu";
import { groupRows } from "./groupRows";
import { processClientData } from "./processClientData";
import type { DataGridProps } from "./types";
import { useGridState } from "./useGridState";

// `<DataGrid>` never uses TanStack's own sorted/filtered/paginated row
// models — `useGridState`/`processClientData` own all of that (see their
// module docs) — so no stock row-model features are registered here, only
// the automatic core row model. `columnSizingFeature`/`columnResizingFeature`
// are the exception: `enableColumnResizing` (a table-level option, not a
// stock row model) gates whether they actually do anything, so registering
// them unconditionally costs nothing when a given <DataGrid> doesn't use
// resize. Declared once at module scope, per TanStack's own guidance, rather
// than recreated on every render.
const gridTableFeatures = tableFeatures({ columnSizingFeature, columnResizingFeature });
type GridTableFeatures = typeof gridTableFeatures;

// TanStack's own default for any column without an explicit `size` (see
// `getDefaultColumnSizingColumnDef` in `columnSizingFeature.utils`) — used
// here only as the fallback a *pinned* column's offset math falls back to
// before a `table` instance exists to ask `getSize()` directly.
const DEFAULT_COLUMN_SIZE = 150;

// Fixed pixel width of each "structural" column DataGrid renders itself
// (row-expand chevron, selection checkbox, per-row actions menu) rather than
// deriving from `columns` — matched by the `width` style applied to their
// own cells below. These always render pinned to the left/right edge of the
// scroll container, regardless of whether any *data* column is `pinned`: a
// data column's own pinned offset must reserve this space (see
// `pinnedOffsets`'s `leadingOffset` param below), otherwise a pinned data
// column sticks at the very edge and scrolls right over these non-sticky
// columns, hiding them once the grid needs to scroll horizontally.
// 36px (the shared `Button`'s `size="icon"`) plus 4px of padding on each
// side — big enough to comfortably hit (WCAG's 44px minimum touch target)
// without the surrounding `p-1` cell padding eating into the button itself.
const DETAIL_COLUMN_WIDTH = 44;
const ROW_ACTIONS_COLUMN_WIDTH = 44;

/**
 * Cumulative sticky `left`/`right` pixel offset per pinned column id, in
 * visible-column order, starting from `leadingOffset` — the combined width
 * of whichever structural columns (expand/selection on the left,
 * row-actions on the right) render before the first data column on that
 * side, so a pinned data column's offset accounts for them instead of
 * assuming it's the first thing in the row.
 */
function pinnedOffsets<TRow>(
  visibleColumns: ColumnDef<TRow>[],
  side: "left" | "right",
  getSize: (columnId: string) => number,
  leadingOffset: number,
): Map<string, number> {
  const offsets = new Map<string, number>();
  let cursor = leadingOffset;
  const ordered = side === "left" ? visibleColumns : [...visibleColumns].reverse();
  for (const column of ordered) {
    if (column.pinned !== side) continue;
    offsets.set(column.id, cursor);
    cursor += getSize(column.id);
  }
  return offsets;
}

/** One run of contiguous visible columns for the optional spanning header-group row. */
type HeaderRun<TRow> =
  | { kind: "group"; label: string; columns: ColumnDef<TRow>[] }
  | { kind: "single"; column: ColumnDef<TRow> };

/**
 * Groups contiguous visible columns sharing the same `headerGroup` label
 * into `"group"` runs; every other column becomes its own `"single"` run —
 * see `BaseColumn.headerGroup`'s doc for why this is positional rather than
 * collecting every same-labeled column regardless of adjacency.
 */
function computeHeaderRuns<TRow>(columns: ColumnDef<TRow>[]): HeaderRun<TRow>[] {
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

function toTanstackColumns<TRow extends RowData>(
  columns: ColumnDef<TRow>[],
): TanstackColumnDef<GridTableFeatures, TRow, unknown>[] {
  return columns.map((column) => ({
    id: column.id,
    header: column.header,
    size: column.width,
    accessorFn: (row: TRow) => getColumnValue(column, row),
    cell: (info: CellContext<GridTableFeatures, TRow, unknown>): ReactNode =>
      column.cell
        ? column.cell(info.getValue(), info.row.original)
        : defaultFormat(column, info.getValue()),
  }));
}

/**
 * A single React Table component covering both client- and server-driven
 * data: filtering, sorting, and pagination all flow through one `GridState`,
 * with `dataSource.mode` deciding whether the grid computes the visible page
 * itself (`"client"`) or trusts a page the caller already computed
 * (`"server"`). Column filter UI defaults to the type-appropriate widget
 * from `src/filter` unless a column supplies its own `cell` renderer.
 */
export function DataGrid<TRow extends RowData>({
  columns,
  dataSource,
  getRowId,
  rowActions,
  headerActions,
  enableMultiSort = false,
  initialState,
  columnVisibility,
  renderDetail,
  enableColumnResizing = false,
  columnResizeMode = "onChange",
  columnSizing: controlledColumnSizing,
  onColumnSizingChange,
  virtualize,
  showPagination = true,
  getRowProps,
  getRowTestId,
  gridState,
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
  testId,
  loading: loadingProp = false,
  groupBy,
  renderGroupHeader,
  defaultGroupsExpanded = true,
  expandedGroups: controlledExpandedGroups,
  onExpandedGroupsChange,
}: DataGridProps<TRow>): ReactElement {
  const { state, filtersByColumn, setColumnFilter, toggleSort, setPage } = useGridState(
    dataSource,
    initialState,
    gridState,
  );
  const [internalSelectedIds, setInternalSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  function updateSelectedIds(next: ReadonlySet<string>): void {
    setInternalSelectedIds(next);
    onSelectedIdsChange?.(next);
  }

  // Same controlled/uncontrolled pattern as `selectedIds` above — without
  // an internal fallback here, dragging a resize handle with no
  // `columnSizing`/`onColumnSizingChange` passed in (the common case; see
  // `enableColumnResizing`'s own doc) had nowhere to write the new width to
  // at all: `useTable` below was never given `state.columnSizing` nor
  // `onColumnSizingChange` in that case, so every drag was silently
  // discarded and no column ever actually resized.
  const [internalColumnSizing, setInternalColumnSizing] = useState<ColumnSizingState>({});
  const columnSizing = controlledColumnSizing ?? internalColumnSizing;
  function updateColumnSizing(next: ColumnSizingState): void {
    setInternalColumnSizing(next);
    onColumnSizingChange?.(next);
  }
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  function toggleRowExpanded(id: string): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Same controlled/uncontrolled pattern as `selectedIds`/`columnSizing`
  // above. A key absent from this record (a group never toggled since it
  // was first seen) falls back to `defaultGroupsExpanded`, not `false` —
  // otherwise every group would render collapsed on first paint.
  const [internalExpandedGroups, setInternalExpandedGroups] = useState<Record<string, boolean>>({});
  const expandedGroupsState = controlledExpandedGroups ?? internalExpandedGroups;
  function updateExpandedGroups(next: Record<string, boolean>): void {
    setInternalExpandedGroups(next);
    onExpandedGroupsChange?.(next);
  }
  function isGroupExpanded(key: string): boolean {
    return expandedGroupsState[key] ?? defaultGroupsExpanded;
  }
  function toggleGroupExpanded(key: string): void {
    updateExpandedGroups({ ...expandedGroupsState, [key]: !isGroupExpanded(key) });
  }

  // Single source of truth for "which columns actually render": every other
  // representation below (the TanStack column defs, the header lookup map,
  // the "No results" colSpan) is derived from this, not from `columns`
  // directly — otherwise two derived views of the same visibility could
  // disagree with each other.
  const visibleColumns = useMemo(
    () =>
      columnVisibility ? columns.filter((column) => isColumnVisible(columnVisibility, column.id)) : columns,
    [columns, columnVisibility],
  );

  // Depend on dataSource.mode/.data (and .rowCount, only in server mode)
  // rather than on `dataSource` itself — a caller that inlines
  // `dataSource={{ mode: "client", data: rows }}` (a natural pattern, and
  // exactly what every test in this file does) creates a new wrapper object
  // on every render, which would defeat this memo entirely if it depended on
  // the wrapper's own identity instead of its actually-relevant fields.
  const serverRowCount = dataSource.mode === "server" ? dataSource.rowCount : undefined;
  const { rows, rowCount } = useMemo(() => {
    if (dataSource.mode === "client") return processClientData(dataSource.data, state);
    return { rows: dataSource.data, rowCount: serverRowCount ?? 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource.mode, dataSource.data, serverRowCount, state]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(getRowId(row))),
    [rows, selectedIds, getRowId],
  );
  const allOnPageSelected = rows.length > 0 && rows.every((row) => selectedIds.has(getRowId(row)));

  function toggleRowSelected(id: string): void {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateSelectedIds(next);
  }

  function toggleAllOnPageSelected(): void {
    const next = new Set(selectedIds);
    for (const row of rows) {
      if (allOnPageSelected) next.delete(getRowId(row));
      else next.add(getRowId(row));
    }
    updateSelectedIds(next);
  }

  const tanstackColumns = useMemo(() => toTanstackColumns(visibleColumns), [visibleColumns]);

  // A Map lookup instead of visibleColumns.find(...) inside the header
  // render loop below — the latter would make header rendering O(columns²)
  // (a linear scan per header, once per header) instead of O(columns).
  const columnById = useMemo(() => {
    const map = new Map<string, ColumnDef<TRow>>();
    for (const column of visibleColumns) map.set(column.id, column);
    return map;
  }, [visibleColumns]);

  const table = useTable({
    features: gridTableFeatures,
    data: rows,
    columns: tanstackColumns,
    getRowId,
    enableColumnResizing,
    columnResizeMode,
    state: { columnSizing },
    onColumnSizingChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnSizing) : updater;
      updateColumnSizing(next);
    },
  });

  const pageCount = Math.max(1, Math.ceil(rowCount / state.pageSize));
  const loading = loadingProp || (dataSource.mode === "server" ? Boolean(dataSource.loading) : false);
  // The checkbox column itself is decoupled from `headerActions`: a caller
  // using controlled `selectedIds` (its own toolbar elsewhere on the page,
  // e.g. a bulk-export button) wants the checkboxes without <DataGrid>'s own
  // redundant "{N} selected" + bulk-actions bar, which stays gated on
  // `headerActions` specifically, below.
  const showSelectionColumn = Boolean(headerActions?.length) || controlledSelectedIds !== undefined;
  const showRowActionsColumn = Boolean(rowActions?.length);
  const showDetailColumn = Boolean(renderDetail);
  const totalColumnCount =
    visibleColumns.length +
    (showDetailColumn ? 1 : 0) +
    (showSelectionColumn ? 1 : 0) +
    (showRowActionsColumn ? 1 : 0);

  // The filter row is entirely opt-in — it only renders at all once at least
  // one visible, filterable column asks for it via `filterDisplay: "row"`
  // (see BaseColumn's doc for why: wide controls like NumberHistogramFilter
  // don't fit well collapsed into the header's compact popover trigger).
  const hasFilterRow = visibleColumns.some((column) => isFilterable(column) && column.filterDisplay === "row");

  // The extra spanning-label header row is entirely opt-in, same pattern as
  // `hasFilterRow` above — only renders at all once at least one visible
  // column sets `headerGroup` (see `BaseColumn.headerGroup`'s doc).
  const headerRuns = useMemo(() => computeHeaderRuns(visibleColumns), [visibleColumns]);
  const hasHeaderGroups = visibleColumns.some((column) => column.headerGroup);

  function renderFilterWidget(column: ColumnDef<TRow>): ReactNode {
    const value = filtersByColumn.get(column.id);
    const onChange = (next: FilterDescriptor | undefined): void => setColumnFilter(column.id, next);
    return column.renderFilter
      ? column.renderFilter(value, onChange, state.filter)
      : renderDefaultFilterWidget(column, value, onChange);
  }

  // `table.getColumn(id)?.getSize()` already resolves to exactly
  // `column.width ?? DEFAULT_COLUMN_SIZE` when resize has never touched that
  // column (TanStack's own resting value), and correctly reflects the live,
  // resized width once it has — one source of truth for both.
  const columnSize = (columnId: string): number => table.getColumn(columnId)?.getSize() ?? DEFAULT_COLUMN_SIZE;
  const leadingStructuralWidth =
    (showDetailColumn ? DETAIL_COLUMN_WIDTH : 0) + (showSelectionColumn ? SELECTION_COLUMN_WIDTH : 0);
  const trailingStructuralWidth = showRowActionsColumn ? ROW_ACTIONS_COLUMN_WIDTH : 0;

  // Memoized on `columnSizing` (rather than recomputed every render) because
  // every scroll tick re-renders this whole component (the virtualizer's own
  // state lives in React state) — without this, scrolling a wide/pinned grid
  // would reallocate both offset Maps (plus, for the right side, a full
  // `[...visibleColumns].reverse()` copy) on every single frame for no
  // reason: neither `visibleColumns` nor any column's resolved size changes
  // just because the scroll position did.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `columnSize` reads `columnSizing`/`table` by closure; both are covered by the explicit deps below.
  const leftPinnedOffsets = useMemo(
    () => pinnedOffsets(visibleColumns, "left", columnSize, leadingStructuralWidth),
    [visibleColumns, columnSizing, leadingStructuralWidth],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see leftPinnedOffsets above.
  const rightPinnedOffsets = useMemo(
    () => pinnedOffsets(visibleColumns, "right", columnSize, trailingStructuralWidth),
    [visibleColumns, columnSizing, trailingStructuralWidth],
  );

  // Combines with (doesn't replace) the `width` style every cell already
  // gets — a pinned column's `left`/`right` offset only makes sense relative
  // to the scrolling `<table>`, and `bg-background` keeps whatever scrolls
  // underneath a pinned cell from showing through it. Only a pinned column,
  // or every column once `enableColumnResizing` is on, gets a concrete
  // width from `columnSize()` — an unpinned column in a non-resizable grid
  // keeps its original natural/content-driven sizing when it has no
  // explicit `width` of its own.
  function pinnedCellProps(
    column: ColumnDef<TRow>,
    area: "header" | "body" = "body",
  ): { className?: string; style?: CSSProperties } {
    // Pinned cells need an opaque background of their own so body/header
    // content scrolling underneath a sticky column doesn't show through —
    // matched to whichever section (header vs. body) they sit in, since the
    // header now carries `bg-muted` while the body stays `bg-background`.
    // Plain template strings rather than `cn()` throughout this function and
    // `structuralCellProps` below: every combination here is a fixed set of
    // internally-controlled utility classes touching unrelated CSS
    // properties (position/z-index vs. background), so there's never a
    // Tailwind conflict for `cn()`'s clsx+twMerge machinery to resolve —
    // called from the memoized per-column maps below, so it already runs
    // once per column per relevant state change, not once per cell.
    const bg = area === "header" ? "bg-muted" : "bg-background";
    if (column.pinned === "left") {
      return { className: `sticky z-10 ${bg}`, style: { left: leftPinnedOffsets.get(column.id), width: columnSize(column.id) } };
    }
    if (column.pinned === "right") {
      return { className: `sticky z-10 ${bg}`, style: { right: rightPinnedOffsets.get(column.id), width: columnSize(column.id) } };
    }
    if (enableColumnResizing) return { style: { width: columnSize(column.id) } };
    return { style: column.width ? { width: column.width } : undefined };
  }

  // Same sticky-pinning treatment as `pinnedCellProps`, for the structural
  // expand/selection/row-actions columns instead of a data column — these
  // always pin (they have no `pinned` prop of their own to opt out with),
  // so a pinned *data* column's reserved `leadingOffset`/its own offset
  // math actually lines up with a column that's really there, rather than a
  // gap left by content that scrolled away underneath it. The `border-b
  // p-1` base is baked in here (every call site below combined it with
  // exactly this className anyway) so callers use `.className` directly
  // instead of re-running `cn()` per row on an already-fixed string.
  function structuralCellProps(
    side: "left" | "right",
    offset: number,
    width: number,
    area: "header" | "body" = "body",
  ): { className: string; style: CSSProperties } {
    const bg = area === "header" ? "bg-muted" : "bg-background";
    return { className: `border-b p-1 sticky z-10 ${bg}`, style: { [side]: offset, width } };
  }

  // Computed once per render (cheap object literals) rather than inline at
  // each of the several header/body/filter-row call sites below, so the
  // selection column's offset — which depends on whether the detail column
  // renders before it — stays in exactly one place.
  const detailCellProps = structuralCellProps("left", 0, DETAIL_COLUMN_WIDTH);
  const selectionCellProps = structuralCellProps(
    "left",
    showDetailColumn ? DETAIL_COLUMN_WIDTH : 0,
    SELECTION_COLUMN_WIDTH,
  );
  const rowActionsCellProps = structuralCellProps("right", 0, ROW_ACTIONS_COLUMN_WIDTH);
  const detailHeaderCellProps = structuralCellProps("left", 0, DETAIL_COLUMN_WIDTH, "header");
  const selectionHeaderCellProps = structuralCellProps(
    "left",
    showDetailColumn ? DETAIL_COLUMN_WIDTH : 0,
    SELECTION_COLUMN_WIDTH,
    "header",
  );
  const rowActionsHeaderCellProps = structuralCellProps("right", 0, ROW_ACTIONS_COLUMN_WIDTH, "header");

  // Precomputed once per *column* (via the memoized maps below), not once
  // per column per *row* — the previous shape called `pinnedCellProps` (and
  // its `cn()` inside) from within the per-row cell-rendering loop, which
  // meant a virtualized 40-visible-row x 10-column grid ran that ~400 times
  // per render (and once per scroll-triggered re-render) instead of 10. Only
  // a pinned-or-resizing column needs a props object at all in the body;
  // every other column's `<td>` falls back to the plain base class below.
  const BODY_TD_BASE_CLASS = "border-b p-2";
  function bodyCellClassAndStyle(column: ColumnDef<TRow>): { className: string; style?: CSSProperties } {
    const pinnedProps = column.pinned || enableColumnResizing ? pinnedCellProps(column) : undefined;
    return {
      className: pinnedProps?.className ? `${BODY_TD_BASE_CLASS} ${pinnedProps.className}` : BODY_TD_BASE_CLASS,
      style: pinnedProps?.style,
    };
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `bodyCellClassAndStyle` closes over `enableColumnResizing`/`leftPinnedOffsets`/`rightPinnedOffsets`/`columnSizing`, all listed explicitly below.
  const bodyCellPropsByColumn = useMemo(() => {
    const map = new Map<string, { className: string; style?: CSSProperties }>();
    for (const column of visibleColumns) map.set(column.id, bodyCellClassAndStyle(column));
    return map;
  }, [visibleColumns, enableColumnResizing, leftPinnedOffsets, rightPinnedOffsets, columnSizing]);

  // Same idea for the two header contexts, each with their own fixed base
  // classes (the plain leaf header row vs. the opt-in filter row) — both
  // still only ever render once per <DataGrid> render (there's exactly one
  // header, not one per row), but memoizing keeps a pure-scroll re-render
  // from re-running `cn()` over every visible column for no reason either.
  function headerCellClassAndStyle(
    column: ColumnDef<TRow>,
    base: string,
  ): { className: string; style?: CSSProperties } {
    const pinnedProps = pinnedCellProps(column, "header");
    const align = alignClassName(column);
    const className = pinnedProps.className ? `${base} ${align} ${pinnedProps.className}` : `${base} ${align}`;
    return { className, style: pinnedProps.style };
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see bodyCellPropsByColumn above.
  const leafHeaderCellPropsByColumn = useMemo(() => {
    const map = new Map<string, { className: string; style?: CSSProperties }>();
    for (const column of visibleColumns) {
      map.set(column.id, headerCellClassAndStyle(column, "relative border-b p-2 font-medium"));
    }
    return map;
  }, [visibleColumns, enableColumnResizing, leftPinnedOffsets, rightPinnedOffsets, columnSizing]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see bodyCellPropsByColumn above.
  const filterHeaderCellPropsByColumn = useMemo(() => {
    const map = new Map<string, { className: string; style?: CSSProperties }>();
    for (const column of visibleColumns) {
      map.set(column.id, headerCellClassAndStyle(column, "border-b p-2 align-top font-normal"));
    }
    return map;
  }, [visibleColumns, enableColumnResizing, leftPinnedOffsets, rightPinnedOffsets, columnSizing]);

  const tableRows = table.getRowModel().rows;
  // Interleaving synthetic group-header rows (and hiding a collapsed
  // bucket's rows) needs a flattened index space to virtualize correctly —
  // out of scope for this pass, so `groupBy` forces virtualization off
  // rather than silently mis-rendering; see `groupBy`'s own doc.
  const shouldVirtualize = Boolean(virtualize) && !groupBy && tableRows.length > (virtualize?.threshold ?? 100);
  const groupedBuckets = useMemo(
    () => (groupBy ? groupRows(tableRows, (row) => groupBy(row.original)) : undefined),
    [tableRows, groupBy],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => virtualize?.estimatedRowHeight ?? 40,
    overscan: virtualize?.overscan ?? 10,
    enabled: shouldVirtualize,
  });
  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : [];
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end : 0;

  // Fires `onEndReached` once per distinct `tableRows.length` — scrolling to
  // the last currently-loaded row while more rows might exist. Guarded by a
  // ref (not state) since it's bookkeeping for an effect, not something that
  // should itself trigger a render.
  const lastVisibleIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1]!.index : -1;
  const notifiedForLengthRef = useRef<number>(-1);
  useEffect(() => {
    if (!virtualize?.onEndReached) return;
    if (lastVisibleIndex < 0 || lastVisibleIndex < tableRows.length - 1) return;
    if (virtualize.hasMore === false) return;
    if (notifiedForLengthRef.current === tableRows.length) return;
    notifiedForLengthRef.current = tableRows.length;
    virtualize.onEndReached();
  }, [lastVisibleIndex, tableRows.length, virtualize]);

  function renderRow(row: (typeof tableRows)[number], measureRef?: (el: Element | null) => void): ReactNode {
    const isExpanded = expandedIds.has(row.id);
    // Each row gets its own `<tbody>` (a `<table>` can hold more than one)
    // instead of every row sharing one big one — a virtualizer's
    // `measureElement` observes exactly one DOM node per index, and a
    // `<tbody>`'s own bounding rect already reflects the combined height of
    // every `<tr>` inside it, INCLUDING an expanded detail row right below
    // it. Measuring the row's own `<tr>` alone (the alternative) would never
    // notice the detail panel's height at all once virtualized.
    const rowProps = getRowProps?.(row.original);
    const rowTestId = getRowTestId?.(row.original) ?? `row-${row.id}`;
    return (
      <tbody key={row.id} ref={measureRef} data-index={row.index}>
        <tr
          {...rowProps}
          data-testid={rowTestId}
          // `cn()` (clsx+twMerge) is only needed here when a caller-supplied
          // `getRowProps().className` might itself carry a conflicting
          // `bg-*` utility that needs resolving against the zebra stripe —
          // the overwhelmingly common case (no `getRowProps` at all) skips
          // straight to a plain string, avoiding that per-row allocation
          // for every grid that doesn't use the feature.
          className={
            rowProps?.className
              ? cn(rowProps.className as string, row.index % 2 === 1 && "bg-foreground/5")
              : row.index % 2 === 1
                ? "bg-foreground/5"
                : undefined
          }
        >
          {showDetailColumn && (
            <td className={detailCellProps.className} style={detailCellProps.style}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${isExpanded ? "Collapse" : "Expand"} row ${row.id}`}
                aria-expanded={isExpanded}
                onClick={(event) => {
                  stopRowClick(event);
                  toggleRowExpanded(row.id);
                }}
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform${isExpanded ? " rotate-90" : ""}`}
                  aria-hidden
                />
              </Button>
            </td>
          )}
          {showSelectionColumn && (
            <td className={selectionCellProps.className} style={selectionCellProps.style}>
              <input
                type="checkbox"
                aria-label={`Select row ${row.id}`}
                checked={selectedIds.has(row.id)}
                onClick={stopRowClick}
                onChange={() => toggleRowSelected(row.id)}
              />
            </td>
          )}
          {/* getVisibleCells() moved behind columnVisibilityFeature in
              v9, which isn't registered here — visibility is already
              resolved above via `visibleColumns`, so every column
              reaching the table is meant to render; getAllCells() is
              the core-only equivalent for that already-filtered set. */}
          {row.getAllCells().map((cell) => {
            const cellProps = bodyCellPropsByColumn.get(cell.column.id);
            return (
              <td key={cell.id} style={cellProps?.style} className={cellProps?.className ?? BODY_TD_BASE_CLASS}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            );
          })}
          {showRowActionsColumn && rowActions && (
            <td className={rowActionsCellProps.className} style={rowActionsCellProps.style}>
              <ActionsMenu items={rowActions} ctx={{ row: row.original }} triggerLabel={`Row actions for ${row.id}`} />
            </td>
          )}
        </tr>
        {showDetailColumn && isExpanded && renderDetail && (
          <tr data-testid={`${rowTestId}-detail`}>
            <td colSpan={totalColumnCount} className="border-b p-2">
              {renderDetail(row.original)}
            </td>
          </tr>
        )}
      </tbody>
    );
  }

  // One `<tbody>` for the group-header row, then each member row as its own
  // sibling `<tbody>` (via `renderRow`) — a `<tbody>` can't nest inside
  // another, and a `<table>` happily holds any number of them.
  function renderGroupedBucket(bucket: NonNullable<typeof groupedBuckets>[number]): ReactNode {
    const expanded = isGroupExpanded(bucket.key);
    const originalRows = bucket.items.map((row) => row.original);
    return (
      <Fragment key={`group-${bucket.key}`}>
        <tbody>
          <tr data-testid={`group-header-${bucket.key}`}>
            <td colSpan={totalColumnCount} className="border-b bg-muted/50 p-2 font-medium">
              <button
                type="button"
                className="flex w-full items-center gap-1 text-left"
                onClick={() => toggleGroupExpanded(bucket.key)}
                aria-expanded={expanded}
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform${expanded ? " rotate-90" : ""}`}
                  aria-hidden
                />
                {renderGroupHeader
                  ? renderGroupHeader(bucket.key, originalRows, expanded)
                  : `${bucket.key} (${originalRows.length})`}
              </button>
            </td>
          </tr>
        </tbody>
        {expanded && bucket.items.map((row) => renderRow(row))}
      </Fragment>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="datagrid">
      {showSelectionColumn && headerActions && (
        <div className="flex items-center justify-between text-sm">
          <span>{selectedRows.length} selected</span>
          <ActionsMenu items={headerActions} ctx={{ selectedRows }} triggerLabel="Bulk actions" />
        </div>
      )}
      <div className="relative">
        {loading && (
          <div
            data-testid="datagrid-loading-overlay"
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/60"
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        )}
        <div
          ref={scrollRef}
          data-testid={testId}
          className={cn("overflow-x-auto rounded-md border", shouldVirtualize && "overflow-y-auto")}
          style={shouldVirtualize ? { maxHeight: virtualize?.maxBodyHeight ?? 480 } : undefined}
        >
        {/*
          `table-fixed` (only once every column has a concrete pixel width —
          see `enableColumnResizing`'s own doc) is required for that width to
          actually determine the rendered column, not just hint at it: the
          browser's default `table-layout: auto` algorithm treats a cell's
          `style.width` as one input among several (including cell content
          across every row) and can render a column far narrower than its
          specified width regardless of what `columnSize()` above computes —
          which silently broke both column resizing (the state updated
          correctly; the table just never reflected it) and pinned columns'
          sticky offset math (each depends on the *rendered* width matching
          `getSize()`). Omitted otherwise so a grid with no explicit widths
          keeps natural, content-driven column sizing.
        */}
        <table className={cn("w-full border-collapse text-sm", enableColumnResizing && "table-fixed")}>
        <thead className="bg-muted">
          {table.getHeaderGroups().map((headerGroup) => {
            // `headerById` backs both the optional spanning-label row below
            // and this leaf row — `table.getHeaderGroups()` always yields
            // exactly one entry (no TanStack column-grouping feature is
            // registered; `headerGroup?: string` is a rendering-only concern
            // handled entirely by `computeHeaderRuns`), so this map is built
            // fresh per (the single) headerGroup, not hoisted further up.
            const headerById = new Map(headerGroup.headers.map((header) => [header.id, header]));

            function renderLeafHeaderCell(column: ColumnDef<TRow>, rowSpan?: number): ReactNode {
              const header = headerById.get(column.id);
              if (!header) return null;
              const sortEntry = state.sort.find((s) => s.field === column.id);
              const sortable = isSortable(column);
              const filterable = isFilterable(column) && column.filterDisplay !== "row";
              const cellProps = leafHeaderCellPropsByColumn.get(column.id);
              return (
                <th key={header.id} rowSpan={rowSpan} style={cellProps?.style} className={cellProps?.className}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 rounded-sm px-1",
                        sortable && "hover:bg-accent hover:text-accent-foreground",
                      )}
                      disabled={!sortable}
                      onClick={(event) =>
                        sortable &&
                        toggleSort(column.id, enableMultiSort && event.shiftKey, column.sortDescFirst === true)
                      }
                    >
                      {column.renderHeader ? column.renderHeader(column) : column.header}
                      {sortable && sortEntry?.dir === "asc" && <BarsArrowUpIcon className="h-3 w-3" aria-hidden />}
                      {sortable && sortEntry?.dir === "desc" && (
                        <BarsArrowDownIcon className="h-3 w-3" aria-hidden />
                      )}
                    </button>
                    {filterable && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Filter ${column.header}`}>
                            <FunnelIcon className="h-3 w-3" aria-hidden />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>{renderFilterWidget(column)}</PopoverContent>
                      </Popover>
                    )}
                  </div>
                  {enableColumnResizing && (
                    <div
                      data-testid={`resize-handle-${column.id}`}
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-accent"
                    />
                  )}
                </th>
              );
            }

            return (
              <Fragment key={headerGroup.id}>
                {hasHeaderGroups && (
                  <tr key={`${headerGroup.id}-groups`} data-testid="header-group-row">
                    {showDetailColumn && (
                      <th
                        rowSpan={2}
                        className={detailHeaderCellProps.className}
                        style={detailHeaderCellProps.style}
                        aria-hidden
                      />
                    )}
                    {showSelectionColumn && (
                      <th
                        rowSpan={2}
                        className={selectionHeaderCellProps.className}
                        style={selectionHeaderCellProps.style}
                      >
                        <input
                          type="checkbox"
                          aria-label="Select all rows on this page"
                          checked={allOnPageSelected}
                          onChange={toggleAllOnPageSelected}
                        />
                      </th>
                    )}
                    {headerRuns.map((run) =>
                      run.kind === "single" ? (
                        renderLeafHeaderCell(run.column, 2)
                      ) : (
                        <th
                          key={`group-${run.label}-${run.columns[0]!.id}`}
                          colSpan={run.columns.length}
                          className="border-b p-2 text-center font-medium"
                        >
                          {run.label}
                        </th>
                      ),
                    )}
                    {showRowActionsColumn && (
                      <th
                        rowSpan={2}
                        className={rowActionsHeaderCellProps.className}
                        style={rowActionsHeaderCellProps.style}
                        aria-label="Row actions"
                      />
                    )}
                  </tr>
                )}
                <tr key={headerGroup.id}>
                  {!hasHeaderGroups && showDetailColumn && (
                    <th
                      className={detailHeaderCellProps.className}
                      style={detailHeaderCellProps.style}
                      aria-hidden
                    />
                  )}
                  {!hasHeaderGroups && showSelectionColumn && (
                    <th
                      className={selectionHeaderCellProps.className}
                      style={selectionHeaderCellProps.style}
                    >
                      <input
                        type="checkbox"
                        aria-label="Select all rows on this page"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPageSelected}
                      />
                    </th>
                  )}
                  {headerGroup.headers.map((header) => {
                    const column = columnById.get(header.id);
                    // Ungrouped columns already rendered (with rowSpan={2})
                    // in the spanning-label row above — only a column that's
                    // part of an actual headerGroup run needs its own cell
                    // in this leaf row.
                    if (!column || (hasHeaderGroups && !column.headerGroup)) return null;
                    return renderLeafHeaderCell(column);
                  })}
                  {!hasHeaderGroups && showRowActionsColumn && (
                    <th
                      className={rowActionsHeaderCellProps.className}
                      style={rowActionsHeaderCellProps.style}
                      aria-label="Row actions"
                    />
                  )}
                </tr>
              </Fragment>
            );
          })}
          {hasFilterRow && (
            <tr data-testid="filter-row">
              {showDetailColumn && (
                <th className={detailHeaderCellProps.className} style={detailHeaderCellProps.style} />
              )}
              {showSelectionColumn && (
                <th
                  className={selectionHeaderCellProps.className}
                  style={selectionHeaderCellProps.style}
                />
              )}
              {visibleColumns.map((column) => {
                const cellProps = filterHeaderCellPropsByColumn.get(column.id);
                return (
                  <th key={column.id} style={cellProps?.style} className={cellProps?.className}>
                    {isFilterable(column) && column.filterDisplay === "row" ? renderFilterWidget(column) : null}
                  </th>
                );
              })}
              {showRowActionsColumn && (
                <th
                  className={rowActionsHeaderCellProps.className}
                  style={rowActionsHeaderCellProps.style}
                />
              )}
            </tr>
          )}
        </thead>
        {rows.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={totalColumnCount} className="p-4 text-center text-muted-foreground">
                {loading ? "Loading..." : "No results."}
              </td>
            </tr>
          </tbody>
        ) : shouldVirtualize ? (
          <>
            {paddingTop > 0 && (
              <tbody>
                <tr aria-hidden="true">
                  <td colSpan={totalColumnCount} style={{ padding: 0, border: "none", height: paddingTop }} />
                </tr>
              </tbody>
            )}
            {virtualItems.map((virtualItem) =>
              renderRow(tableRows[virtualItem.index]!, (el) => virtualizer.measureElement(el)),
            )}
            {paddingBottom > 0 && (
              <tbody>
                <tr aria-hidden="true">
                  <td colSpan={totalColumnCount} style={{ padding: 0, border: "none", height: paddingBottom }} />
                </tr>
              </tbody>
            )}
          </>
        ) : groupedBuckets ? (
          groupedBuckets.map((bucket) => renderGroupedBucket(bucket))
        ) : (
          tableRows.map((row) => renderRow(row))
        )}
        </table>
        </div>
      </div>
      {showPagination && (
        <div className="flex items-center justify-between text-sm">
          <span>
            Page {state.page + 1} of {pageCount} ({rowCount} row{rowCount === 1 ? "" : "s"})
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={state.page <= 0}
              onClick={() => setPage(state.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={state.page >= pageCount - 1}
              onClick={() => setPage(state.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
