import { BarsArrowDownIcon, BarsArrowUpIcon, FunnelIcon } from "@heroicons/react/24/outline";
import type {
  CellContext,
  ColumnDef as TanstackColumnDef,
  ColumnSizingState,
  Row as TanstackRow,
  RowData,
} from "@tanstack/react-table";
import { columnResizingFeature, columnSizingFeature, flexRender, tableFeatures, useTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, Loader2 } from "lucide-react";
import type {
  ClipboardEvent as ReactClipboardEvent,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactElement,
  ReactNode,
} from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { parseTsv, rangeToTsv } from "../cell-editing/clipboard";
import { coerceValueForColumn } from "../cell-editing/coerce";
import { computeFillChanges } from "../cell-editing/fillHandle";
import { buildIndexMap, normalizeRange } from "../cell-editing/rangeUtils";
import { AlwaysEditCell, type AtomicGestureContext } from "../cell-editing/renderAlwaysEditCell";
import { renderCellModeCell } from "../cell-editing/renderCellModeCell";
import { SelectionOverlay } from "../cell-editing/SelectionOverlay";
import type { CellAddress, CellChange } from "../cell-editing/types";
import type { CellEditingCellContext } from "../cell-editing/useCellEditingState";
import { useCellEditingState } from "../cell-editing/useCellEditingState";
import { useCellSelection } from "../cell-editing/useCellSelection";
import { alignClassName } from "../column/format";
import type { ColumnDef } from "../column/types";
import { getColumnValue, isEditable, isFilterable, isSortable } from "../column/types";
import { Button } from "../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { EditingBar } from "../edit/EditingBar";
import type { EditingCellContext } from "../edit/editingState";
import { useEditingState } from "../edit/editingState";
import { renderEditableCell } from "../edit/renderEditableCell";
import { renderDefaultFilterWidget } from "../filter/registry";
import type { FilterDescriptor } from "../filter/types";
import { useGroupExpansion } from "../hooks/useGroupExpansion";
import { useStickyGroupHeaderTop } from "../hooks/useStickyGroupHeaderTop";
import { useVisibleColumns } from "../hooks/useVisibleColumns";
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

// Floor for keyboard-driven resize (ArrowLeft on the resize handle) — mouse
// drag has no equivalent floor today, but a keyboard user has no visual
// feedback while resizing, so this keeps a column from being shrunk to
// (or past) zero-width by holding the key down.
const MIN_COLUMN_SIZE = 40;

// `aria-sort` belongs on the `<th>` itself, not the toggle `<button>` inside
// it (WAI-ARIA "sort" property — see the table sort pattern in APG): screen
// readers announce a header's sort state from the cell, not from focusing a
// child control. `"none"` (rather than omitting the attribute) tells
// assistive tech this header *is* sortable but not the current sort key,
// distinct from a non-sortable column, which gets no `aria-sort` at all.
function sortDirToAriaSort(dir: "asc" | "desc" | undefined): "ascending" | "descending" | "none" {
  if (dir === "asc") return "ascending";
  if (dir === "desc") return "descending";
  return "none";
}

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

// Stable empty-array identity for `useCellSelection`'s `rowIds`/`columnIds`
// when `cellEditing` isn't set — a fresh `[]` literal every render would
// still be a *different* array each time, defeating `buildIndexMap`'s own
// memoization for no reason (selection is inert either way, but the memo
// should stay cheap regardless).
const EMPTY_ID_ARRAY: string[] = [];

/**
 * Whether a clipboard event's target is a genuine native text field — an
 * `<input>` (covers `StringEditor`/`NumberEditor`/`DateEditor`, the last via
 * `<input type="date">`) or a `<textarea>` (`MultilineStringEditor`) —
 * deliberately NOT true for `EnumEditor`/`BooleanEditor`'s Radix-based
 * button/listbox widgets, which have no free text of their own to copy/paste
 * natively. Used by `handleCopy`/`handlePaste` to defer to the browser under
 * `cellEditing.alwaysEdit`, where every editable cell's own editor is always
 * mounted, so there's no single `editingCell` left to check the way
 * click-to-edit mode does.
 */
function isNativeTextFieldTarget(event: { target: EventTarget | null }): boolean {
  const tag = (event.target as HTMLElement | null)?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
}

// Opaque equivalent of the body row's translucent `bg-foreground/5` zebra
// tint, for the structural expand/selection/row-actions columns' `sticky`
// cells — a translucent background there would let horizontally-scrolled
// column content show through underneath on odd rows.
const STRUCTURAL_ZEBRA_BG_CLASS = "bg-[color-mix(in_srgb,var(--color-foreground)_5%,var(--color-background))]";

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

/**
 * One entry in the flattened, virtualizable render list `<DataGrid>` windows
 * over below (see `flatItems`'s own doc) — a synthetic group-header, or one
 * real table row. Kept as its own module-scope generic (rather than inlined
 * where `flatItems` is computed) so `renderFlatItem`/`renderGroupHeaderTbody`
 * can share the exact same shape without either side re-deriving it.
 */
type FlatItem<TRow extends RowData> =
  | { kind: "header"; key: string; rows: TRow[] }
  | { kind: "row"; row: TanstackRow<GridTableFeatures, TRow> };

/**
 * `toTanstackColumns` takes the editing-context REF (a stable object
 * identity for the whole component's lifetime), not the context value
 * directly — `flexRender` renders `columnDef.cell` as a component (its own
 * effective "type" for React's reconciliation, not just a value), so a
 * `cell` function that closes over `pendingEdits`/`editErrors` directly
 * would get a new identity every time either changes, i.e. on every
 * keystroke in any editor. React would then see a changed component type at
 * the same tree position and remount the ENTIRE table body under it — every
 * cell in every row, losing focus (and any other DOM/component state) out
 * from under the very input the user is typing into. Reading through
 * `useEditingState`'s `ctxRef` instead keeps every `cell` closure's identity
 * fixed to `visibleColumns` alone (exactly the `tanstackColumns` memo's
 * pre-editing dependency set below), while still reading whatever
 * `pendingEdits`/`editErrors`/`onEdit` actually is at the moment a cell
 * renders — the ref is reassigned every render, synchronously, before the
 * JSX returned below is processed. `<TreeDataGrid>` has no such memoized
 * column-def layer standing between it and every render, so it reads
 * `useEditingState`'s plain `ctx` value directly instead of needing this.
 *
 * `cellEditingCtxRef` follows the identical recipe for `cellEditing` mode's
 * own per-keystroke state (`CellEditingCellContext`). At most one of
 * `editingCtxRef.current`/`cellEditingCtxRef.current` is ever set (the two
 * modes are mutually exclusive — see `DataGridProps.cellEditing`'s own doc),
 * so which renderer a cell uses is decided fresh on every actual render,
 * with neither ref itself ever appearing in this function's own deps.
 *
 * `atomicGestureRef` is the same recipe again, for `AlwaysEditCell`'s own
 * atomic-widget gesture handling (`AtomicGestureContext`) — see its own doc.
 */
function toTanstackColumns<TRow extends RowData>(
  columns: ColumnDef<TRow>[],
  editingCtxRef: { current: EditingCellContext<TRow> | undefined },
  cellEditingCtxRef: { current: CellEditingCellContext<TRow> | undefined },
  atomicGestureRef: { current: AtomicGestureContext | undefined },
): TanstackColumnDef<GridTableFeatures, TRow, unknown>[] {
  return columns.map((column) => ({
    id: column.id,
    header: column.header,
    size: column.width,
    accessorFn: (row: TRow) => getColumnValue(column, row),
    cell: (info: CellContext<GridTableFeatures, TRow, unknown>): ReactNode => {
      const cellEditingCtx = cellEditingCtxRef.current;
      if (!cellEditingCtx) return renderEditableCell(column, info.row.original, info.getValue(), editingCtxRef.current);
      return cellEditingCtx.alwaysEdit ? (
        <AlwaysEditCell
          column={column}
          row={info.row.original}
          rawValue={info.getValue()}
          ctx={cellEditingCtx}
          atomicGesture={atomicGestureRef.current}
        />
      ) : (
        renderCellModeCell(column, info.row.original, info.getValue(), cellEditingCtx)
      );
    },
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
  onGridStateChange,
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
  testId,
  loading: loadingProp = false,
  groupBy,
  renderGroupHeader,
  defaultGroupsExpanded = true,
  expandedGroups: controlledExpandedGroups,
  onExpandedGroupsChange,
  zebra = true,
  showTotals = false,
  editing,
  cellEditing,
}: DataGridProps<TRow>): ReactElement {
  // Not supported together with `groupBy` yet — `cellEditingRowIds` below is
  // built from the flat `tableRows` list, but rendering only shows expanded-
  // group rows via `groupedBuckets`'s own bucketed order, so a keyboard-
  // navigated selection could land on a row hidden inside a collapsed group.
  // Same "one silently stands down" precedent as `groupBy`+`virtualize` (see
  // `virtualize`'s own doc) rather than a hard error.
  const hasCellEditing = Boolean(cellEditing) && !groupBy;
  const { state, filtersByColumn, setColumnFilter, toggleSort, setPage } = useGridState(
    dataSource,
    initialState,
    gridState,
    showPagination,
    onGridStateChange,
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
  // above. Shared with `<TreeDataGrid>`'s own `groupBy` support via
  // `useGroupExpansion`.
  const { isGroupExpanded, toggleGroupExpanded } = useGroupExpansion(
    defaultGroupsExpanded,
    controlledExpandedGroups,
    onExpandedGroupsChange,
  );

  const { pendingEdits, editErrors, ctxRef: editingCtxRef, handleSaveEdits, handleDiscardEdits } = useEditingState(
    editing,
    getRowId,
  );
  // Gated on `hasCellEditing` (not `cellEditing` directly) so the groupBy
  // stand-down above (see that flag's own doc) also disables the per-cell
  // renderer/editor state, not just selection.
  const { ctx: cellEditingCtx, ctxRef: cellEditingCtxRef, applyChanges: applyCellChanges } = useCellEditingState(
    hasCellEditing ? cellEditing : undefined,
    getRowId,
  );
  // Same "stable ref identity, reassigned every render" recipe as
  // `editingCtxRef`/`cellEditingCtxRef` above — assigned further down, once
  // `cellSelection`/`pendingOpenEnumCell` (which its callbacks close over)
  // exist, but declared here so `tanstackColumns` below can take it without
  // depending on either.
  const atomicGestureRef = useRef<AtomicGestureContext | undefined>(undefined);

  // Single source of truth for "which columns actually render": every other
  // representation below (the TanStack column defs, the header lookup map,
  // the "No results" colSpan) is derived from this, not from `columns`
  // directly — otherwise two derived views of the same visibility could
  // disagree with each other. Shared with `<TreeDataGrid>`'s own
  // `columnVisibility` support via `useVisibleColumns`.
  const visibleColumns = useVisibleColumns(columns, columnVisibility);

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

  // Depends only on `visibleColumns` — exactly as before editing existed.
  // `editingCtxRef` is a `useRef` object, whose own identity never changes,
  // so it contributes nothing to this memo's invalidation; each column's
  // `cell` closure reads `editingCtxRef.current` fresh on every actual
  // render regardless (see `toTanstackColumns`'s doc for why that
  // indirection is what keeps typing in an editor from remounting the grid).
  const tanstackColumns = useMemo(
    () => toTanstackColumns(visibleColumns, editingCtxRef, cellEditingCtxRef, atomicGestureRef),
    [visibleColumns],
  );

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

  // `table.getRow(id)` THROWS for an id no longer in the row model (verified
  // against @tanstack/table-core's coreRowsFeature.utils), unlike the
  // `?.original`-chained call sites below that were written assuming it
  // degrades to `undefined` — a real risk here specifically, since a
  // `cellEditing` selection/edit can reference a row id that's since been
  // removed from `data` (a consumer's own `onCellsChange` handler, or a
  // refetch). `getRowModel().rowsById` is a plain object lookup, so a
  // missing id just reads as `undefined`.
  function findRowById(rowId: string): TRow | undefined {
    return table.getRowModel().rowsById[rowId]?.original;
  }

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

  // Same "entirely opt-in" convention as `hasFilterRow`/`hasHeaderGroups`
  // above — the per-group summary row inside `renderGroupHeaderTbody` and
  // the `showTotals` `<tfoot>` both only render once at least one visible
  // column sets `summary` (see `BaseColumn.summary`'s own doc); a `groupBy`
  // or `showTotals` grid with no column opting in renders exactly as it did
  // before either feature existed.
  const hasColumnSummary = visibleColumns.some((column) => column.summary);

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
  // exactly this className anyway) so callers use `.className`/`.classNameOdd`
  // directly instead of re-running `cn()` per row on an already-fixed string.
  function structuralCellProps(
    side: "left" | "right",
    offset: number,
    width: number,
    area: "header" | "body" = "body",
  ): { className: string; classNameOdd: string; style: CSSProperties } {
    // A header structural cell (select-all checkbox, expand-all chevron) also
    // sticks to the top of the scroll container -- z-20 so it stays above a
    // body row's own z-10 side-pinned cells once both are visible at once.
    const base = area === "header" ? "border-b border-border p-1 sticky top-0 z-20" : "border-b border-border p-1 sticky z-10";
    const bg = area === "header" ? "bg-muted" : "bg-background";
    const bgOdd = area === "header" ? "bg-muted" : STRUCTURAL_ZEBRA_BG_CLASS;
    return {
      className: `${base} ${bg}`,
      classNameOdd: `${base} ${bgOdd}`,
      style: { [side]: offset, width },
    };
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
  const BODY_TD_BASE_CLASS = "border-b border-border p-2";
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
    options: { sticky?: boolean } = {},
  ): { className: string; style?: CSSProperties } {
    const pinnedProps = pinnedCellProps(column, "header");
    const align = alignClassName(column);
    // `pinnedProps.className` (when set) comes first so `cn()`'s twMerge
    // resolves overlapping utilities (z-10/bg-muted from side-pinning) in
    // favor of whatever comes after -- the sticky-to-top treatment needs to
    // win: z-20 (not the side-pin's z-10) so a pinned column's header cell
    // still renders above a *body* row's own side-pinned cell once scrolled.
    const className = cn(
      base,
      align,
      pinnedProps.className,
      options.sticky && "sticky top-0 z-20 bg-muted",
    );
    return { className, style: pinnedProps.style };
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see bodyCellPropsByColumn above.
  const leafHeaderCellPropsByColumn = useMemo(() => {
    const map = new Map<string, { className: string; style?: CSSProperties }>();
    for (const column of visibleColumns) {
      map.set(
        column.id,
        headerCellClassAndStyle(column, "relative border-b border-border p-2 font-medium", { sticky: true }),
      );
    }
    return map;
  }, [visibleColumns, enableColumnResizing, leftPinnedOffsets, rightPinnedOffsets, columnSizing]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see bodyCellPropsByColumn above.
  const filterHeaderCellPropsByColumn = useMemo(() => {
    const map = new Map<string, { className: string; style?: CSSProperties }>();
    for (const column of visibleColumns) {
      map.set(column.id, headerCellClassAndStyle(column, "border-b border-border p-2 align-top font-normal"));
    }
    return map;
  }, [visibleColumns, enableColumnResizing, leftPinnedOffsets, rightPinnedOffsets, columnSizing]);

  const tableRows = table.getRowModel().rows;

  // Dev-only guardrail: `showPagination={false}` with no explicit `pageSize`
  // now resolves to an effectively unbounded page (see `useGridState`'s own
  // doc), so this only fires for what that fix can't cover -- a controlled
  // `gridState` prop whose `pageSize` doesn't (or no longer) cover every
  // row, or a `dataSource: {mode: "server"}` response smaller than the
  // `rowCount` it reported. An explicit, uncontrolled `initialState.pageSize`
  // is the deliberate fixed-size-chunking use case and must never warn.
  const truncationWarnedRef = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (showPagination) return;
    if (truncationWarnedRef.current) return;
    if (!gridState && initialState?.pageSize !== undefined) return;
    if (tableRows.length >= rowCount) return;
    truncationWarnedRef.current = true;
    console.warn(
      `[DataGrid] showPagination={false} but only ${tableRows.length} of ${rowCount} row(s) are rendered, with no pagination UI to reach the rest. Pass an explicit pageSize (via initialState or gridState) that covers every row you want visible, or a dataSource that returns all of them.`,
    );
  }, [showPagination, gridState, initialState?.pageSize, tableRows.length, rowCount]);

  const groupedBuckets = useMemo(
    () => (groupBy ? groupRows(tableRows, (row) => groupBy(row.original)) : undefined),
    [tableRows, groupBy],
  );
  // A group-header row sticks right below the real `<thead>` while its
  // members scroll past -- `top` has to be the header's actual rendered
  // height (it varies with the optional filter/header-group rows and with
  // column-resize-driven wrapping), not a guessed constant. Shared with
  // `<TreeDataGrid>`'s own `groupBy` support via `useStickyGroupHeaderTop`.
  const { theadRef, groupHeaderTop } = useStickyGroupHeaderTop(Boolean(groupBy));

  // `threshold` is documented (see `DataGridVirtualizeOptions.threshold`) as
  // a REAL row count -- keyed off `tableRows.length`, not the flattened
  // render list below, so a grouped grid's synthetic header entries never
  // push a caller's actual row count over a threshold they didn't cross.
  // Identical to `flatItems.length` whenever `groupBy` is unset (no headers
  // to inflate the count), so this is a no-op change for every non-grouped
  // grid.
  const shouldVirtualize = Boolean(virtualize) && tableRows.length > (virtualize?.threshold ?? 100);

  // The single flattened, index-addressable render list `shouldVirtualize`
  // above gates windowing over -- a plain `{kind: "row"}` per table row when
  // `groupBy` is unset, or one `{kind: "header"}` entry per bucket
  // (contributing its OWN member rows right after it, only while that
  // bucket is expanded -- a collapsed bucket contributes just its header)
  // when it is. Flattening headers and rows into one array, instead of
  // virtualizing `tableRows` directly and rendering group headers as a
  // separate non-virtualized wrapper around them, is what makes `groupBy`
  // and `virtualize` composable at all: `useVirtualizer` needs one
  // contiguous, positionally-addressable list to window over, and a
  // header's height needs measuring/positioning exactly like a data row's.
  // Only actually built while virtualizing -- neither the plain `tableRows`
  // path nor `renderGroupedBucket`'s own non-virtualized grouped path below
  // ever reads it, and building it unconditionally would re-walk every
  // bucket (recomputing the exact same `bucket.items.map((row) =>
  // row.original)` `renderGroupedBucket` already does) purely to throw the
  // result away on every render of a grid that never virtualizes at all.
  const flatItems = useMemo<FlatItem<TRow>[]>(() => {
    if (!shouldVirtualize) return [];
    if (!groupedBuckets) return tableRows.map((row) => ({ kind: "row", row }));
    const items: FlatItem<TRow>[] = [];
    for (const bucket of groupedBuckets) {
      const originalRows = bucket.items.map((row) => row.original);
      items.push({ kind: "header", key: bucket.key, rows: originalRows });
      if (isGroupExpanded(bucket.key)) {
        for (const row of bucket.items) items.push({ kind: "row", row });
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `isGroupExpanded`'s identity is the only one of these deps that actually changes on an expand/collapse toggle (both the controlled-`expandedGroups`-object and uncontrolled-internal-Set forms get a fresh identity from their own setter); `groupedBuckets`/`tableRows` don't change from expand/collapse alone, they're listed because the memo also needs to re-run when the underlying data/grouping itself changes.
  }, [shouldVirtualize, groupedBuckets, tableRows, isGroupExpanded]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => virtualize?.estimatedRowHeight ?? 40,
    overscan: virtualize?.overscan ?? 10,
    enabled: shouldVirtualize,
  });
  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : [];
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end : 0;

  // Fires `onEndReached` once per distinct `tableRows.length` -- the real
  // loaded-data count, deliberately NOT `flatItems.length`: the latter also
  // shifts on a pure expand/collapse toggle (no data changed at all), which
  // would defeat the "won't fire again for the same data" contract
  // (`DataGridVirtualizeOptions.onEndReached`'s own doc) the instant a
  // caller collapses a group while already scrolled to the bottom. WHERE
  // "the end" currently is, though, is still a `flatItems`/`virtualItems`
  // question (collapsing the last bucket really does move the bottom of the
  // rendered content) -- only the dedup fingerprint changes here. Guarded by
  // a ref (not state) since it's bookkeeping for an effect, not something
  // that should itself trigger a render.
  const lastVisibleIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1]!.index : -1;
  const notifiedForLengthRef = useRef<number>(-1);
  // A sort/filter change means the caller's `onStateChange` handler is about
  // to replace `dataSource.data` with an entirely new loaded window (a fresh
  // first page for the new sort/filter), not grow the existing one — reset
  // the dedup guard so a same-length replacement (e.g. the new window also
  // happens to be exactly one page long, the common case) doesn't get
  // silently mistaken for "already notified for this length" and swallowed.
  // Keyed off `state.filter`/`state.sort` identity, not `state.page`: this
  // mode doesn't own pagination (see `virtualize.onEndReached`'s own doc),
  // so a `page` change here would only come from some other caller-driven
  // reset, which already goes through a fresh `dataSource.data` (and thus a
  // real `tableRows.length` change) on its own.
  useEffect(() => {
    notifiedForLengthRef.current = -1;
  }, [state.filter, state.sort]);
  useEffect(() => {
    if (!virtualize?.onEndReached) return;
    if (lastVisibleIndex < 0 || lastVisibleIndex < flatItems.length - 1) return;
    if (virtualize.hasMore === false) return;
    if (notifiedForLengthRef.current === tableRows.length) return;
    notifiedForLengthRef.current = tableRows.length;
    virtualize.onEndReached();
  }, [lastVisibleIndex, flatItems.length, tableRows.length, virtualize]);

  // Full logical row/column id lists (not just currently-mounted virtual
  // items) for `useCellSelection`'s range math and keyboard navigation — see
  // that hook's own doc for why id-keying (rather than DOM/virtualized
  // index) is what makes a selection survive virtualized mount/unmount.
  // Depends on `hasCellEditing` (not `cellEditing` itself) for the same
  // reason `serverRowCount`/`dataSource` above do: a caller inlining
  // `cellEditing={{ onCellsChange: fn }}` as a fresh object every render
  // must not defeat this memo just because that wrapper's identity changed.
  const cellEditingRowIds = useMemo(
    () => (hasCellEditing ? tableRows.map((row) => row.id) : EMPTY_ID_ARRAY),
    [hasCellEditing, tableRows],
  );
  const cellEditingColumnIds = useMemo(
    () => (hasCellEditing ? visibleColumns.map((column) => column.id) : EMPTY_ID_ARRAY),
    [hasCellEditing, visibleColumns],
  );
  const cellEditingRowIndex = useMemo(() => buildIndexMap(cellEditingRowIds), [cellEditingRowIds]);
  const cellSelection = useCellSelection({
    rowIds: cellEditingRowIds,
    columnIds: cellEditingColumnIds,
    onNavigateToRow: (rowId) => {
      if (!shouldVirtualize) return;
      const index = cellEditingRowIndex.get(rowId);
      if (index !== undefined) virtualizer.scrollToIndex(index);
    },
  });

  // Tracks the cell a mousedown started on — whether it was a shift-extend,
  // whether the pointer ever moved to a *different* cell before mouseup, and
  // whether this cell was ALREADY the one being edited at mousedown time —
  // the three things `handleMouseUp` below needs to tell a plain click (open
  // that cell's editor, Excel's single-click-to-edit convention) apart from
  // a real drag-select, and from a click that landed inside an
  // already-open editor (e.g. to reposition its text cursor). That last
  // check can't be redone at mouseup time by just reading
  // `cellEditingCtx.editingCell` then: `handleCellMouseDown`'s own
  // `scrollRef.current?.focus()` call blurs (closes/commits) whatever was
  // being edited as an ordinary side effect of moving focus, including this
  // very cell if the click landed inside it — by mouseup, `editingCell` is
  // already `undefined` either way, so only capturing the answer up front
  // (before that focus call) can tell "was already editing this cell, don't
  // reopen it" apart from "was editing elsewhere, now free to open this one".
  // Refs, not state: read-then-cleared synchronously inside a native event
  // handler, never rendered.
  const clickCellRef = useRef<{ rowId: string; columnId: string; extend: boolean; wasEditing: boolean } | null>(null);
  const dragMovedRef = useRef(false);
  // The one built-in enum (`<Select>`) cell (if any) that should open its
  // dropdown right now — see `AtomicGestureContext.shouldOpenEnum`'s own
  // doc for why `AlwaysEditCell` needs this instead of just letting Radix's
  // native open-on-click happen. Set (once) by `handleMouseUp` below;
  // deliberately never cleared back to `undefined` afterward — once set,
  // `AlwaysEditCell` opens itself and takes over its own open/close state
  // via `onOpenChange` from then on, so leaving this pointed at the same
  // cell is inert, not a standing "force reopen."
  const [pendingOpenEnumCell, setPendingOpenEnumCell] = useState<CellAddress | undefined>(undefined);

  atomicGestureRef.current = {
    shouldOpenEnum: (rowId, columnId) =>
      pendingOpenEnumCell?.rowId === rowId && pendingOpenEnumCell?.columnId === columnId,
    // Mirrors exactly what `handleCellMouseDown` below does for every other
    // cell, minus the click-to-edit-only tail end (irrelevant here — always
    // invoked under `alwaysEdit`, same as that function's own early return
    // for it) — see `AtomicGestureContext.registerSelection`'s own doc for
    // why `AlwaysEditCell` can't just rely on that function running on its
    // own for a gesture it suppresses.
    registerSelection: (rowId, columnId, extend) => {
      cellSelection.startSelection({ rowId, columnId }, { extend });
      clickCellRef.current = { rowId, columnId, extend, wasEditing: false };
      dragMovedRef.current = false;
    },
  };

  /** Opens `cell`'s editor for a plain (non-extending, non-dragged) click — shared by the mouseup-commits-a-click path below and `handleCellDoubleClick`. No-ops if the cell isn't editable, or is (STILL — this check runs after `handleCellMouseDown`'s own blur-on-focus already had its chance to close it) the one being edited: `handleCellDoubleClick` has no `wasEditing` snapshot of its own to rely on, so this is what stops its second click's `dblclick` from clobbering a draft the reopen already produced. */
  function beginEditFromClick(cell: { rowId: string; columnId: string }): void {
    if (!cellEditingCtx) return;
    if (cellEditingCtx.editingCell?.rowId === cell.rowId && cellEditingCtx.editingCell.columnId === cell.columnId) return;
    const column = columnById.get(cell.columnId);
    const row = findRowById(cell.rowId);
    if (!column || row === undefined || !isEditable(column, row)) return;
    cellEditingCtx.onBeginEdit(cell);
  }

  // Mousemove/mouseup are attached to `window` (not the scroll container)
  // while a drag is in progress — the pointer commonly moves outside the
  // container's own bounds mid-drag (e.g. past its edge), and a container-
  // scoped listener alone would silently stop tracking the drag at that
  // point. Coalesced through one `requestAnimationFrame` per frame — never a
  // raw `updateDrag` call per native `mousemove` event — which is the fix
  // for the exact perf bug this whole feature exists to replace (see
  // `useCellSelection.updateDrag`'s own doc: a hand-rolled excel-grid
  // implementation elsewhere in this org rebuilt its entire column-def array
  // on every unthrottled mousemove pixel during a drag-fill).
  const pendingDragCellRef = useRef<{ rowId: string; columnId: string } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!cellSelection.isDragging) return;
    function handleMouseMove(event: MouseEvent): void {
      const cellEl = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-cell-row]");
      const rowId = cellEl?.dataset.cellRow;
      const columnId = cellEl?.dataset.cellCol;
      if (rowId === undefined || columnId === undefined) return;
      const anchor = clickCellRef.current;
      if (anchor && (rowId !== anchor.rowId || columnId !== anchor.columnId)) dragMovedRef.current = true;
      pendingDragCellRef.current = { rowId, columnId };
      if (dragRafRef.current !== null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        if (pendingDragCellRef.current) cellSelection.updateDrag(pendingDragCellRef.current);
      });
    }
    function handleMouseUp(): void {
      cellSelection.endDrag();
      const clickCell = clickCellRef.current;
      clickCellRef.current = null;
      if (!clickCell || clickCell.extend || clickCell.wasEditing || dragMovedRef.current) return;
      // Under `alwaysEdit`, `beginEditFromClick` has nothing to do (see
      // `editingCell`'s own doc: meaningless there) — the one thing a plain
      // click still needs to trigger explicitly is opening a built-in enum
      // widget's dropdown, since `AlwaysEditCell` unconditionally suppresses
      // its native open-on-click while closed (see `AtomicGestureContext`'s
      // own doc for why). Every other atomic type there already reacts to a
      // plain click as normal (only a modifier-held one is suppressed), so
      // there's nothing further to do for them here.
      if (cellEditingCtx?.alwaysEdit) {
        const column = columnById.get(clickCell.columnId);
        if (column?.type === "enum" && !column.renderEditCell) {
          setPendingOpenEnumCell({ rowId: clickCell.rowId, columnId: clickCell.columnId });
        }
        return;
      }
      beginEditFromClick(clickCell);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (dragRafRef.current !== null) cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    };
  }, [cellSelection.isDragging, cellSelection.updateDrag, cellSelection.endDrag]);

  // Same rAF-coalesced window-listener recipe as the range-select drag
  // above, for the fill-handle's own separate drag mode — mutually
  // exclusive with it (the handle's own `onMouseDown` in `SelectionOverlay`
  // stops propagation specifically so this doesn't also start a range-select
  // drag on the cell underneath it).
  const pendingFillCellRef = useRef<{ rowId: string; columnId: string } | null>(null);
  const fillRafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!cellSelection.isFillDragging) return;
    function handleMouseMove(event: MouseEvent): void {
      const cellEl = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-cell-row]");
      const rowId = cellEl?.dataset.cellRow;
      const columnId = cellEl?.dataset.cellCol;
      if (rowId === undefined || columnId === undefined) return;
      pendingFillCellRef.current = { rowId, columnId };
      if (fillRafRef.current !== null) return;
      fillRafRef.current = requestAnimationFrame(() => {
        fillRafRef.current = null;
        if (pendingFillCellRef.current) cellSelection.updateFillDrag(pendingFillCellRef.current);
      });
    }
    function handleMouseUp(): void {
      const result = cellSelection.endFillDrag();
      if (!result || !cellEditingCtx) return;
      const changes = computeFillChanges(
        result.sourceRange,
        result.finalRange,
        cellEditingRowIds,
        cellEditingColumnIds,
        visibleColumns,
        findRowById,
      );
      if (changes.length > 0) applyCellChanges(changes);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (fillRafRef.current !== null) cancelAnimationFrame(fillRafRef.current);
      fillRafRef.current = null;
    };
    // Deliberately NOT depending on `cellEditingCtx`/`applyCellChanges`/
    // `findRowById`/etc. — none of those have a stable identity across
    // renders (they're plain functions, not memoized), so including them
    // would resubscribe this effect's window listeners on every render
    // while a drag is in progress, not just when the drag itself starts or
    // stops. `handleMouseUp` still reads the current values of each via
    // closure at the moment it actually fires (mouseup), which is fresh
    // enough for everything except one narrow edge case: toggling
    // `cellEditing.disabled` mid-drag doesn't abort an already-started
    // fill-drag's eventual commit. Accepted as a known limitation rather
    // than reintroducing per-render effect churn to close it.
  }, [cellSelection.isFillDragging, cellSelection.updateFillDrag, cellSelection.endFillDrag]);

  // A cell's editor is a real DOM node (an `<input>`/`<textarea>`/etc.) that
  // unmounts the instant `editingCell` clears — commit, cancel, or a blur
  // that reverted an invalid draft. Removing a FOCUSED node doesn't move
  // focus anywhere in particular (typically `document.body`), so without
  // this, every one of those endings would silently strand keyboard focus
  // outside the grid: F2/arrow-key navigation right after committing a cell
  // would have nothing to bubble through, since the scroll container
  // (`handleCellKeyDown`'s listener) is no longer in the event's path at
  // all. `justEndedEditingRef` tracks the transition (defined -> undefined)
  // rather than firing on mount, when nothing was ever focused here yet.
  const wasEditingCellRef = useRef<CellAddress | undefined>(undefined);
  useEffect(() => {
    const wasEditing = wasEditingCellRef.current !== undefined;
    wasEditingCellRef.current = cellEditingCtx?.editingCell;
    if (!wasEditing || cellEditingCtx?.editingCell) return;
    // Only when focus landed nowhere in particular (the browser's default
    // once a focused node is removed) — a blur caused by clicking some OTHER
    // focusable element on the page (not this cell) already sent focus
    // there before this effect runs; grabbing it back here would undo that
    // deliberate navigation away from the grid.
    if (document.activeElement === document.body) scrollRef.current?.focus();
  });

  function handleFillHandleMouseDown(): void {
    cellSelection.startFillDrag();
  }

  function handleCellMouseDown(event: ReactMouseEvent<HTMLDivElement>): void {
    if (!hasCellEditing) return;
    const cellEl = (event.target as HTMLElement).closest<HTMLElement>("[data-cell-row]");
    const rowId = cellEl?.dataset.cellRow;
    const columnId = cellEl?.dataset.cellCol;
    if (rowId === undefined || columnId === undefined) return;
    cellSelection.startSelection({ rowId, columnId }, { extend: event.shiftKey });
    // Recorded for the window `mouseup` handler above: a plain click (this
    // exact cell, not shift-extended, never dragged elsewhere) either opens
    // its editor (click-to-edit mode's Excel convention) or, under
    // `alwaysEdit`, opens a built-in enum widget's own dropdown (see
    // `AtomicGestureContext`'s own doc for why that needs a signal from
    // here rather than just Radix's native click handling). Reset per
    // mousedown, not per click, so a genuine drag never leaves a stale
    // "moved" flag around to falsely block the *next* plain click.
    // `wasEditing` must be read NOW, before `scrollRef.current?.focus()`
    // below has a chance to blur (and thus close) this very cell — see
    // `clickCellRef`'s own doc for why that makes this the only correct
    // moment to snapshot it.
    const wasEditing = cellEditingCtx?.editingCell?.rowId === rowId && cellEditingCtx.editingCell.columnId === columnId;
    clickCellRef.current = { rowId, columnId, extend: event.shiftKey, wasEditing };
    dragMovedRef.current = false;
    // Under `alwaysEdit`, every editable cell already has its own always-
    // mounted editor (`AlwaysEditCell`) — there's no click-to-edit gesture to
    // open via `scrollRef.current?.focus()` below, which would only fight
    // the click's own natural job of focusing whichever control it landed
    // on. Selection (for copy/paste/fill-handle) still works exactly the
    // same either way, via `startSelection` above; `clickCellRef` set just
    // above is still needed here, for `handleMouseUp`'s own atomic-open
    // decision.
    if (cellEditingCtx?.alwaysEdit) return;
    // A click landing INSIDE the cell that's already being edited (e.g. to
    // reposition the text cursor, or drag-select some of its own text) must
    // be left alone entirely — moving focus below would blur-and-close it
    // via `renderCellModeCell`'s own `onBlur`, which is exactly the "commit
    // this and move on" gesture a genuinely different cell's click means,
    // not what a click *within* the same still-open editor means.
    if (wasEditing) return;
    // The scroll container itself (not any cell) holds keyboard focus for
    // arrow/Tab/Enter navigation — cells are plain `<td>`s, not focusable
    // controls, so a click needs to explicitly move focus here. Also what
    // closes/commits a currently-open editor elsewhere on the grid: moving
    // focus here blurs that editor's `<input>`, synchronously (before this
    // handler returns) triggering `renderCellModeCell`'s own `onBlur`
    // commit/cancel.
    scrollRef.current?.focus();
  }

  const CELL_NAV_KEYS: Record<string, "up" | "down" | "left" | "right"> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  /** Looks up the actual row/column for a selected cell address, for the begin-edit triggers below — `undefined` if either no longer exists (e.g. the row was removed from `data` since the selection was made). */
  function resolveSelectedCell(): { column: ColumnDef<TRow>; row: TRow } | undefined {
    const focus = cellSelection.selection?.focus;
    if (!focus) return undefined;
    const column = columnById.get(focus.columnId);
    const row = findRowById(focus.rowId);
    if (!column || row === undefined) return undefined;
    return { column, row };
  }

  function handleCellKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (!hasCellEditing || !cellEditingCtx) return;
    // Under `alwaysEdit`, focus normally lives inside one of the always-
    // mounted per-cell `<input>`s, not the scroll container — this whole
    // custom arrow/Tab/Enter-moves-the-selection model would fight native
    // text-cursor movement and native Tab order between real form controls.
    // `AlwaysEditCell` owns its own Escape-to-revert locally; there's nothing
    // left here for it to do.
    if (cellEditingCtx.alwaysEdit) return;
    // While a cell is being edited, its own wrapper (`renderCellModeCell`)
    // owns Escape/Enter/Tab — this handler only ever sees them AFTER that
    // one has already committed (or reverted) and let the event bubble; see
    // that function's own doc on how the two compose. `editingCell` alone
    // can't tell the two "still editing" cases apart here: it's React state,
    // so a commit that just fired via `closeEditor()` hasn't cleared it yet
    // in THIS same synchronous dispatch — `consumeJustCommitted()` is the
    // one signal that's already up to date at this point.
    if (cellEditingCtx.editingCell && !cellEditingCtx.consumeJustCommitted()) return;

    const direction = CELL_NAV_KEYS[event.key];
    if (direction) {
      event.preventDefault();
      cellSelection.moveSelection(direction, { extend: event.shiftKey });
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      cellSelection.moveSelection(event.shiftKey ? "left" : "right");
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      cellSelection.moveSelection("down");
      return;
    }

    // Begin-edit triggers: F2 (start from the current value), or typing any
    // single printable character directly — Excel's own "just start typing"
    // gesture — which REPLACES the cell's current value with what was typed
    // rather than appending to it.
    const isPrintableChar = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (event.key !== "F2" && !isPrintableChar) return;
    const target = resolveSelectedCell();
    if (!target || !isEditable(target.column, target.row)) return;
    event.preventDefault();
    cellEditingCtx.onBeginEdit(
      { rowId: cellEditingCtx.getRowId(target.row), columnId: target.column.id },
      isPrintableChar ? event.key : undefined,
    );
  }

  // Mostly a backstop now that a single plain click already opens a cell's
  // editor (see `handleCellMouseDown`'s own doc): still needed for the case
  // where the first click of the pair landed as a drag/extend (so its own
  // mouseup didn't open anything) but the second one didn't move — reuses
  // `beginEditFromClick`'s own "already editing this exact cell" guard so it
  // can't clobber a draft the first click already opened.
  function handleCellDoubleClick(event: ReactMouseEvent<HTMLDivElement>): void {
    if (!hasCellEditing || !cellEditingCtx || cellEditingCtx.alwaysEdit) return;
    const cellEl = (event.target as HTMLElement).closest<HTMLElement>("[data-cell-row]");
    const rowId = cellEl?.dataset.cellRow;
    const columnId = cellEl?.dataset.cellCol;
    if (rowId === undefined || columnId === undefined) return;
    beginEditFromClick({ rowId, columnId });
  }

  function handleCopy(event: ReactClipboardEvent<HTMLDivElement>): void {
    // While a cell is actively being edited, a copy targets whatever text is
    // selected inside its own `<input>` — ordinary browser behavior, not a
    // range-copy of the whole selection. `isNativeTextFieldTarget` covers the
    // same case under `alwaysEdit`, where every editable cell's `<input>` is
    // always mounted (so there's no single `editingCell` to check) — an
    // atomic editor (enum/boolean/date) is a button/listbox, not a real text
    // field, so it's untouched by that check and still gets the range-copy.
    if (!hasCellEditing || !cellSelection.selection || cellEditingCtx?.editingCell || isNativeTextFieldTarget(event)) return;
    event.preventDefault();
    const text = rangeToTsv(cellSelection.selection, rows, cellEditingRowIds, visibleColumns, cellEditingColumnIds, getRowId);
    event.clipboardData.setData("text/plain", text);
  }

  /** Builds one `CellChange` for `(row, col)` from `raw` pasted/filled text, or `undefined` to skip that cell — not editable, no longer exists, or `raw` doesn't coerce to that column's type (see `coerceValueForColumn`'s own doc). */
  function buildCellChange(row: number, col: number, raw: string): CellChange<TRow> | undefined {
    const rowId = cellEditingRowIds[row];
    const columnId = cellEditingColumnIds[col];
    if (rowId === undefined || columnId === undefined) return undefined;
    const column = columnById.get(columnId);
    const rowData = findRowById(rowId);
    if (!column || rowData === undefined || !isEditable(column, rowData)) return undefined;
    const coerced = coerceValueForColumn(column, raw);
    if (!coerced) return undefined;
    return { rowId, row: rowData, columnId, previousValue: getColumnValue(column, rowData), value: coerced.value };
  }

  function handlePaste(event: ReactClipboardEvent<HTMLDivElement>): void {
    // While a cell is actively being edited, a paste goes into its own
    // `<input>` — ordinary browser behavior, not a range-paste. Same
    // `alwaysEdit` nuance as `handleCopy` above.
    if (!hasCellEditing || !cellSelection.selection || cellEditingCtx?.editingCell || isNativeTextFieldTarget(event)) return;
    // Not gated on `text` being non-empty: the Clipboard API can't
    // distinguish "nothing on the clipboard" from "an empty string was
    // copied" (`getData` returns `""` either way) — treating it as the
    // latter and clearing the selection matches how pasting a copied blank
    // cell behaves in a real spreadsheet, rather than silently doing nothing.
    const text = event.clipboardData.getData("text/plain");
    event.preventDefault();
    const normalized = normalizeRange(cellSelection.selection, cellEditingRowIndex, buildIndexMap(cellEditingColumnIds));
    if (!normalized) return;
    const parsed = parseTsv(text);
    const changes: CellChange<TRow>[] = [];
    // A single copied value fills every selected cell (Excel's own
    // behavior for pasting one value onto a multi-cell selection); a real
    // multi-cell block instead anchors at the selection's top-left corner
    // and extends to match the pasted shape, clipped to grid bounds.
    if (parsed.length === 1 && parsed[0]?.length === 1) {
      const raw = parsed[0]![0]!;
      for (let r = normalized.rowStart; r <= normalized.rowEnd; r++) {
        for (let c = normalized.colStart; c <= normalized.colEnd; c++) {
          const change = buildCellChange(r, c, raw);
          if (change) changes.push(change);
        }
      }
    } else {
      for (let ri = 0; ri < parsed.length; ri++) {
        const line = parsed[ri]!;
        for (let ci = 0; ci < line.length; ci++) {
          const change = buildCellChange(normalized.rowStart + ri, normalized.colStart + ci, line[ci]!);
          if (change) changes.push(change);
        }
      }
    }
    if (changes.length > 0) applyCellChanges(changes);
  }

  function renderRow(
    row: (typeof tableRows)[number],
    measureRef?: (el: Element | null) => void,
    // Position within the flattened, virtualized render list (`flatItems`) —
    // distinct from `row.index` (this row's position within `tableRows`
    // alone) once `groupBy` interleaves header entries: `@tanstack/react-
    // virtual`'s `measureElement` reads the rendered node's `data-index`
    // attribute back to know which measurement slot it just measured (see
    // `<TreeDataGrid>`'s identical `data-index` doc for the same
    // requirement), so this MUST match the row's actual `flatItems` index
    // whenever virtualized. Defaults to `row.index`, which is already
    // correct for every non-grouped call site (virtualized or not) and for
    // every non-virtualized call site (the attribute is simply inert then).
    dataIndex: number = row.index,
  ): ReactNode {
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
    const isOddRow = zebra && row.index % 2 === 1;
    return (
      <tbody key={row.id} ref={measureRef} data-index={dataIndex}>
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
              ? cn("divide-x divide-border", rowProps.className as string, isOddRow && "bg-foreground/5")
              : `divide-x divide-border${isOddRow ? " bg-foreground/5" : ""}`
          }
        >
          {showDetailColumn && (
            <td
              className={isOddRow ? detailCellProps.classNameOdd : detailCellProps.className}
              style={detailCellProps.style}
            >
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
            <td
              className={isOddRow ? selectionCellProps.classNameOdd : selectionCellProps.className}
              style={selectionCellProps.style}
            >
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
              <td
                key={cell.id}
                style={cellProps?.style}
                className={cellProps?.className ?? BODY_TD_BASE_CLASS}
                // Only present under `cellEditing` — the anchor `handleCellMouseDown`/
                // the window drag listener/`SelectionOverlay` all look these up by
                // attribute selector; see `useCellSelection`'s own doc for why
                // row-id/column-id (not DOM index) is the addressing scheme.
                data-cell-row={hasCellEditing ? row.id : undefined}
                data-cell-col={hasCellEditing ? cell.column.id : undefined}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            );
          })}
          {showRowActionsColumn && rowActions && (
            <td
              className={isOddRow ? rowActionsCellProps.classNameOdd : rowActionsCellProps.className}
              style={rowActionsCellProps.style}
            >
              <ActionsMenu items={rowActions} ctx={{ row: row.original }} triggerLabel={`Row actions for ${row.id}`} />
            </td>
          )}
        </tr>
        {showDetailColumn && isExpanded && renderDetail && (
          <tr data-testid={`${rowTestId}-detail`}>
            <td colSpan={totalColumnCount} className="border-b border-border p-2">
              {renderDetail(row.original)}
            </td>
          </tr>
        )}
      </tbody>
    );
  }

  // One `<td>` per visible column for the (non-sticky) per-group summary
  // row, each running that column's own `summary(rows)` (blank for a column
  // with none). `bgClassName` matches the label row above it
  // (`zebra ? "bg-muted" : "bg-background"`) so the two rows read as one
  // block. `showTotals`'s own `<tfoot>` needs different per-cell treatment
  // (sticky-to-bottom, always `bg-muted`) and builds its cells directly in
  // `renderTotalsFooter` instead of through this helper. Reuses
  // `bodyCellPropsByColumn` (pinning/resizing) rather than recomputing it,
  // same as every actual data-row cell.
  function renderGroupSummaryCells(rows: TRow[], bgClassName: string): ReactNode {
    return visibleColumns.map((column) => {
      const cellProps = bodyCellPropsByColumn.get(column.id);
      return (
        <td
          key={column.id}
          className={cn(cellProps?.className, bgClassName, "font-medium", alignClassName(column))}
          style={cellProps?.style}
        >
          {column.summary?.(rows)}
        </td>
      );
    });
  }

  // The leading detail/selection and trailing row-actions columns get one
  // blank filler cell each (matching `totalColumnCount`) rather than their
  // own pinned/interactive treatment -- there's no per-row checkbox/expand
  // affordance to show in a summary row. Unlike a real body row's own
  // pinned structural cells, these fillers aren't independently sticky-left/
  // right themselves; harmless while blank (nothing to misalign), but a
  // grid combining `enableColumnResizing`-style side pinning with a
  // `summary` column AND horizontal scroll could see this filler scroll out
  // ahead of a still-pinned data column. Documented as a known gap rather
  // than solved here, same tolerance the module's `groupBy`/`zebra` striping
  // gap already has (see AGENTS.md's "Known limitations").
  function summaryLeadingCellSpan(): number {
    return (showDetailColumn ? 1 : 0) + (showSelectionColumn ? 1 : 0);
  }

  function renderGroupSummaryRow(rows: TRow[]): ReactNode {
    const leadingSpan = summaryLeadingCellSpan();
    const bgClassName = zebra ? "bg-muted" : "bg-background";
    const fillerClass = cn("border-b border-border p-2", bgClassName);
    return (
      <tr data-testid="group-summary-row" className="divide-x divide-border">
        {leadingSpan > 0 && <td colSpan={leadingSpan} className={fillerClass} />}
        {renderGroupSummaryCells(rows, bgClassName)}
        {showRowActionsColumn && <td className={fillerClass} aria-hidden />}
      </tr>
    );
  }

  // `showTotals`'s grand-total row -- sticky to the BOTTOM of the scroll
  // container (`bottom-0`, mirroring the header's own `top-0` stickiness),
  // so it stays visible while scrolling a tall grid instead of requiring a
  // scroll all the way down to see it, exactly the UX a "totals row"
  // exists for. `<tfoot>` renders after every `<tbody>` in source order
  // here, but HTML/CSS table layout always places a `<tfoot>` visually at
  // the bottom of the table regardless of where it appears in markup.
  function renderTotalsFooter(): ReactNode {
    if (!showTotals || !hasColumnSummary) return null;
    const summaryRows = tableRows.map((row) => row.original);
    const leadingSpan = summaryLeadingCellSpan();
    const fillerClass = "sticky bottom-0 z-20 border-t border-border bg-muted p-2";
    return (
      <tfoot>
        <tr data-testid="totals-row" className="divide-x divide-border">
          {leadingSpan > 0 && <td colSpan={leadingSpan} className={fillerClass} />}
          {visibleColumns.map((column) => {
            const pinnedProps = pinnedCellProps(column, "header");
            return (
              <td
                key={column.id}
                className={cn(
                  "border-t border-border p-2 font-medium",
                  alignClassName(column),
                  pinnedProps.className,
                  "sticky bottom-0 z-20 bg-muted",
                )}
                style={pinnedProps.style}
              >
                {column.summary?.(summaryRows)}
              </td>
            );
          })}
          {showRowActionsColumn && <td className={fillerClass} aria-hidden />}
        </tr>
      </tfoot>
    );
  }

  // Its own `<tbody>` (not nested inside anything else, matching every
  // per-row `<tbody>` from `renderRow`) so `measureRef`/`data-index` work the
  // exact same way a data row's does once virtualized -- shared by the
  // non-virtualized grouped path (`renderGroupedBucket`) and the virtualized
  // one (`renderFlatItem`), so a header's rendered markup can't drift
  // between the two.
  function renderGroupHeaderTbody(
    key: string,
    rows: TRow[],
    measureRef?: (el: Element | null) => void,
    dataIndex?: number,
  ): ReactNode {
    const expanded = isGroupExpanded(key);
    return (
      <tbody key={`group-${key}`} ref={measureRef} data-index={dataIndex}>
        <tr data-testid={`group-header-${key}`}>
          <td
            colSpan={totalColumnCount}
            className={cn("sticky z-20 border-b p-2 font-medium", zebra ? "bg-muted" : "bg-background")}
            style={{ top: groupHeaderTop }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-1 text-left"
              onClick={() => toggleGroupExpanded(key)}
              aria-expanded={expanded}
            >
              <ChevronRight
                className={`h-4 w-4 shrink-0 transition-transform${expanded ? " rotate-90" : ""}`}
                aria-hidden
              />
              {renderGroupHeader ? renderGroupHeader(key, rows, expanded) : `${key} (${rows.length})`}
            </button>
          </td>
        </tr>
        {/* Not sticky, unlike the label row above -- it scrolls away with
            this group's own member rows once its `<tbody>` scrolls past the
            real `<thead>`, same as any other non-pinned content underneath a
            sticky element. Rendered regardless of `expanded`, which is the
            entire point: a collapsed group's per-column subtotal is often
            the only reason to collapse it in the first place. */}
        {hasColumnSummary && renderGroupSummaryRow(rows)}
      </tbody>
    );
  }

  // One `<tbody>` for the group-header row (via `renderGroupHeaderTbody`),
  // then each member row as its own sibling `<tbody>` (via `renderRow`) — a
  // `<tbody>` can't nest inside another, and a `<table>` happily holds any
  // number of them. Used only in the non-virtualized grouped path;
  // `renderFlatItem` below covers the same two shapes one flattened item at
  // a time once virtualized.
  function renderGroupedBucket(bucket: NonNullable<typeof groupedBuckets>[number]): ReactNode {
    const expanded = isGroupExpanded(bucket.key);
    const originalRows = bucket.items.map((row) => row.original);
    return (
      <Fragment key={`group-${bucket.key}`}>
        {renderGroupHeaderTbody(bucket.key, originalRows)}
        {expanded && bucket.items.map((row) => renderRow(row))}
      </Fragment>
    );
  }

  // Dispatches one `flatItems` entry to whichever of `renderGroupHeaderTbody`
  // / `renderRow` its `kind` needs — the virtualized render loop's per-item
  // callback, so it can stay a plain one-line `.map()` below.
  function renderFlatItem(
    item: FlatItem<TRow>,
    index: number,
    measureRef?: (el: Element | null) => void,
  ): ReactNode {
    if (item.kind === "header") return renderGroupHeaderTbody(item.key, item.rows, measureRef, index);
    return renderRow(item.row, measureRef, index);
  }

  return (
    // `h-full`/`min-h-0` here and on the two wrappers below are no-ops unless
    // a consumer itself gives <DataGrid> a bounded height (e.g. wraps it in
    // its own `flex-1 min-h-0` container) -- percentage heights fall back to
    // `auto` with no definite ancestor height, so every existing natural-
    // height usage renders unchanged. Wrap it in a bounded container, though,
    // and this cascades down to the actual scrolling div below instead of
    // silently rendering at full unbounded content height, which used to
    // force any consumer wanting a bounded, page-filling grid to add its own
    // *second* `overflow-auto` wrapper around <DataGrid> -- two nested scroll
    // containers (that one scrolling vertically, this component's own
    // `overflow-x-auto` div scrolling horizontally) fighting over which one
    // a sticky header/pinned column is actually stuck relative to.
    <div className="flex h-full min-h-0 flex-col gap-2" data-testid="datagrid">
      {editing && pendingEdits.size > 0 && (
        <EditingBar
          editing={editing}
          pendingRowCount={pendingEdits.size}
          editErrors={editErrors}
          onSave={() => void handleSaveEdits()}
          onDiscard={handleDiscardEdits}
        />
      )}
      {showSelectionColumn && headerActions && (
        <div className="flex shrink-0 items-center justify-between text-sm">
          <span>{selectedRows.length} selected</span>
          <ActionsMenu items={headerActions} ctx={{ selectedRows }} triggerLabel="Bulk actions" />
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {loading && (
          <div
            data-testid="datagrid-loading-overlay"
            className="absolute inset-0 z-30 flex items-center justify-center bg-background/60"
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        )}
        <div
          ref={scrollRef}
          data-testid={testId}
          className={cn("h-full overflow-auto rounded-md border", hasCellEditing && "relative")}
          style={shouldVirtualize ? { maxHeight: virtualize?.maxBodyHeight ?? 480 } : undefined}
          // `tabIndex`/`onKeyDown` only under `cellEditing` — the scroll
          // container itself (not any individual cell, which is a plain
          // `<td>`, not a focusable control) holds keyboard focus for
          // arrow/Tab/Enter navigation between cells.
          tabIndex={hasCellEditing ? 0 : undefined}
          onMouseDown={hasCellEditing ? handleCellMouseDown : undefined}
          onDoubleClick={hasCellEditing ? handleCellDoubleClick : undefined}
          onKeyDown={hasCellEditing ? handleCellKeyDown : undefined}
          onCopy={hasCellEditing ? handleCopy : undefined}
          onPaste={hasCellEditing ? handlePaste : undefined}
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
        <thead ref={theadRef} className="bg-muted">
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
              const headerContent = column.renderHeader ? column.renderHeader(column) : column.header;
              const headerLabelId = `${header.id}-label`;
              return (
                <th
                  key={header.id}
                  rowSpan={rowSpan}
                  style={cellProps?.style}
                  className={cellProps?.className}
                  aria-sort={sortable ? sortDirToAriaSort(sortEntry?.dir) : undefined}
                  // Named via aria-labelledby pointing at the headerLabelId element below,
                  // not name-from-content on the <th> itself: without it, the filter
                  // trigger's own aria-label and the resize handle's `aria-label` (added
                  // for keyboard support below) would otherwise get concatenated into this
                  // header cell's computed accessible name too. Deliberately NOT a plain
                  // `aria-label={column.header}` override, though — `column.header` is a
                  // plain string required for things like width-estimation heuristics, but
                  // a column can render genuinely richer content via `renderHeader` (e.g. a
                  // two-line combined label for two related fields sharing one column) whose
                  // full text belongs in the accessible name too, not just `column.header`.
                  // aria-labelledby lets the labelled element's own name-from-content do
                  // that correctly while still excluding the filter/resize controls, which
                  // live outside it as siblings.
                  aria-labelledby={headerLabelId}
                >
                  <div className="flex items-center gap-1">
                    {sortable ? (
                      <button
                        type="button"
                        id={headerLabelId}
                        data-testid={`sort-button-${column.id}`}
                        className="flex items-center gap-1 rounded-sm px-1 hover:bg-accent hover:text-accent-foreground"
                        onClick={(event) =>
                          toggleSort(column.id, enableMultiSort && event.shiftKey, column.sortDescFirst === true)
                        }
                      >
                        {headerContent}
                        {sortEntry?.dir === "asc" && <BarsArrowUpIcon className="h-3 w-3" aria-hidden />}
                        {sortEntry?.dir === "desc" && <BarsArrowDownIcon className="h-3 w-3" aria-hidden />}
                      </button>
                    ) : (
                      // Not wrapped in a `<button>` (unlike the sortable branch above): a
                      // disabled `<button>` swallows pointer events for its entire subtree,
                      // silently breaking any interactive content a column's own `renderHeader`
                      // embeds directly (bare filter inputs, "select/reject all" buttons) —
                      // clicks never reach them at all, even though nothing looks wrong visually.
                      <div id={headerLabelId} className="flex items-center gap-1 px-1">
                        {headerContent}
                      </div>
                    )}
                    {filterable && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`filter-trigger-${column.id}`}
                            aria-label={`Filter ${column.header}`}
                          >
                            <FunnelIcon
                              className={cn(
                                "h-3 w-3",
                                filtersByColumn.get(column.id) !== undefined
                                  ? "opacity-100 text-primary"
                                  : "opacity-40",
                              )}
                              aria-hidden
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>{renderFilterWidget(column)}</PopoverContent>
                      </Popover>
                    )}
                  </div>
                  {enableColumnResizing && (
                    <div
                      data-testid={`resize-handle-${column.id}`}
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${column.header} column`}
                      tabIndex={0}
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      onKeyDown={(event) => {
                        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                        event.preventDefault();
                        const delta = event.key === "ArrowRight" ? 10 : -10;
                        const nextSize = Math.max(MIN_COLUMN_SIZE, columnSize(column.id) + delta);
                        updateColumnSizing({ ...columnSizing, [column.id]: nextSize });
                      }}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    />
                  )}
                </th>
              );
            }

            return (
              <Fragment key={headerGroup.id}>
                {hasHeaderGroups && (
                  <tr key={`${headerGroup.id}-groups`} data-testid="header-group-row" className="divide-x divide-border">
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
                          className="border-b border-border p-2 text-center font-medium"
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
                <tr key={headerGroup.id} className="divide-x divide-border">
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
            <tr data-testid="filter-row" className="divide-x divide-border">
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
              renderFlatItem(flatItems[virtualItem.index]!, virtualItem.index, (el) =>
                virtualizer.measureElement(el),
              ),
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
        {renderTotalsFooter()}
        </table>
        {hasCellEditing && (
          <SelectionOverlay
            containerRef={scrollRef}
            range={cellSelection.effectiveRange}
            fillPreviewRange={cellSelection.fillPreviewRange}
            onFillHandleMouseDown={
              cellSelection.selection && !cellSelection.isDragging && !cellEditingCtx?.editingCell
                ? handleFillHandleMouseDown
                : undefined
            }
          />
        )}
        </div>
      </div>
      {showPagination && (
        <div className="flex shrink-0 items-center justify-between text-sm">
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
