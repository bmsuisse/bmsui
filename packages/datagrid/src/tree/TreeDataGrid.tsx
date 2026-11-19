import { GridErrorState, GridInlineError, LoadingRows, resolveStatusLabels, toErrorInfo, type GridStatusLabels } from "../components/status";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { alignClassName } from "../column/format";
import type { ColumnDef } from "../column/types";
import { getColumnValue, isFilterable, isSortable } from "../column/types";
import { Checkbox } from "../components/ui/checkbox";
import { EditingBar } from "../edit/EditingBar";
import type { EditingCellContext } from "../edit/editingState";
import { useEditingState } from "../edit/editingState";
import { renderEditableCell } from "../edit/renderEditableCell";
import { FilterLabelsProvider } from "../filter/labels";
import { BmsLocaleProvider, useIntegratedI18n } from "../i18n/locale";
import { renderDefaultFilterWidget } from "../filter/registry";
import type { FilterDescriptor } from "../filter/types";
import { fieldKey, leafFilters } from "../filter/types";
import { groupRows } from "../grid/groupRows";
import { HeaderCellContent } from "../grid/HeaderCellContent";
import { computeHeaderRuns } from "../grid/headerRuns";
import { withColumnFilter, withToggledSort } from "../grid/useGridState";
import { useGroupExpansion } from "../hooks/useGroupExpansion";
import { useBottomOffset } from "../hooks/useBottomOffset";
import { useColumnSizing } from "../hooks/useColumnSizing";
import { useStickyGroupHeaderTop } from "../hooks/useStickyGroupHeaderTop";
import { useViewportWidthVar } from "../hooks/useViewportWidthVar";
import { useVisibleColumns } from "../hooks/useVisibleColumns";
import { SELECTION_COLUMN_WIDTH } from "../lib/structuralColumns";
import { ACTIVE_ROW_CLASS, activeRowProps } from "../lib/activeRow";
import { cn, stopRowClick } from "../lib/utils";
import { ActionsMenu } from "../menu/ActionsMenu";
import { ColumnResizeHandle } from "./ColumnResizeHandle";
import type { FlatTreeRow } from "./flattenTree";
import { filterSortTree } from "./filterSortTree";
import { flattenTree } from "./flattenTree";
import { computeSelectionStates } from "./selectionState";
import type { RowSelectionState } from "./selectionState";
import type { TreeAccessors, TreeDataGridProps } from "./types";
import { useTreeState } from "./useTreeState";

// The separator line of a pinned cell is an inset shadow, not a `border`: with collapsed borders
// a cell's background stops short of its border, so the scrolling rows would show through it.
const HEAD_LINE = "shadow-[inset_0_-1px_0_0_var(--color-border)]";
const FOOT_LINE = "shadow-[inset_0_1px_0_0_var(--color-border)]";

const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();
const UNCHECKED_STATE: RowSelectionState = { checked: false, indeterminate: false };
const NO_IDS: ReadonlySet<string> = new Set();

function sortDirToAriaSort(dir: "asc" | "desc" | undefined): "ascending" | "descending" | "none" {
  if (dir === "asc") return "ascending";
  if (dir === "desc") return "descending";
  return "none";
}

function renderCell<TRow>(
  column: ColumnDef<TRow>,
  row: TRow,
  editingCtx: EditingCellContext<TRow> | undefined,
): ReactNode {
  return renderEditableCell(column, row, getColumnValue(column, row), editingCtx);
}

interface TreeCellProps<TRow> {
  flatRow: FlatTreeRow<TRow>;
  column: ColumnDef<TRow>;
  indentSize: number;
  isLoading: boolean;
  error: string | undefined;
  labels: GridStatusLabels;
  onToggle: () => void;
  onRetry: () => void;
  editingCtx: EditingCellContext<TRow> | undefined;
}

function TreeCell<TRow>({
  flatRow,
  column,
  indentSize,
  isLoading,
  error,
  labels,
  onToggle,
  onRetry,
  editingCtx,
}: TreeCellProps<TRow>): ReactElement {
  const { t } = useIntegratedI18n();
  return (
    <div className="flex items-center gap-1" style={{ paddingLeft: flatRow.depth * indentSize }}>
      {flatRow.hasChildren ? (
        <button
          type="button"
          onClick={(event) => {
            stopRowClick(event);
            onToggle();
          }}
          disabled={isLoading}
          aria-label={t(flatRow.isExpanded ? "grid.collapse" : "grid.expand")}
          aria-expanded={flatRow.isExpanded}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {isLoading ? (
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : flatRow.isExpanded ? (
            <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      ) : (
        <span className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {/* `min-w-0 flex-1` (added alongside editing support) lets this span
          actually shrink/grow within the flex row instead of relying on its
          content's natural size — needed for the default editors' own
          `w-full` inputs to size correctly next to the indentation/chevron;
          `truncate` still applies to (and only visibly affects) static text
          content, same as before. */}
      <span className="min-w-0 flex-1 truncate">{renderCell(column, flatRow.row, editingCtx)}</span>
      {/* Rendered on the parent row itself rather than as a synthetic extra
          row, so the flattened row count (and the virtualizer's count) never
          has to account for error state — see useTreeState's module doc for
          why a failed fetch surfaces via errorIds instead of throwing. */}
      {flatRow.isExpanded && error ? (
        <GridInlineError
          error={{ message: labels.nodeLoadFailed, details: error }}
          onRetry={onRetry}
          labels={labels}
          className="ml-1 shrink-0"
        />
      ) : null}
    </div>
  );
}

/**
 * A lazy-loading tree grid: generalizes a consuming app's contract tree list
 * (a from-scratch hand-rolled hierarchy table with no shared abstraction)
 * into a reusable component on top of the same `ColumnDef<TRow>` system
 * `<DataGrid>` uses. Sorting and filtering are opt-in and fully controlled
 * (`gridState` + `onGridStateChange`, see `filterSortTree`); without them the
 * tree renders in the order `data` gives it.
 *
 * Row indentation + the expand/collapse chevron are prepended to whichever
 * column's cell matches `treeColumnId` (defaults to `columns[0]`); every
 * other column renders exactly like it would in `<DataGrid>`.
 */
export function TreeDataGrid<TRow>({
  columns,
  data,
  loading = false,
  error,
  onRetry,
  statusLabels,
  treeColumnId,
  columnVisibility,
  columnOrder,
  getRowId,
  getChildren,
  hasChildren,
  onLoadChildren,
  initialExpandedLevel = 0,
  expanded: controlledExpanded,
  onExpandedChange,
  childrenMap: controlledChildrenMap,
  onChildrenMapChange,
  indentSize = 20,
  getRowProps,
  getRowTestId,
  rowActions,
  virtualizeThreshold = 100,
  estimatedRowHeight = 40,
  maxBodyHeight = 480,
  testId,
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
  getRowSelectionState,
  isRowSelectionDisabled,
  groupBy,
  renderGroupHeader,
  defaultGroupsExpanded = true,
  expandedGroups: controlledExpandedGroups,
  onExpandedGroupsChange,
  zebra = true,
  showTotals = false,
  totals,
  totalsPosition = "bottom",
  totalsRowProps,
  tableProps,
  apiRef,
  cellPadding = "default",
  filterTriggerTestId,
  editing,
  enableColumnResizing = false,
  columnSizing: controlledColumnSizing,
  onColumnSizingChange,
  gridState,
  onGridStateChange,
  enableMultiSort = false,
  activeRowId,
  onActiveRowChange,
  filterLabels,
  locale,
}: TreeDataGridProps<TRow>): ReactElement {
  const i18n = useIntegratedI18n(locale);
  const { t } = i18n;
  const labels = resolveStatusLabels(statusLabels, i18n);
  const hasError = toErrorInfo(error, t("status.unknownError")) !== undefined;
  const accessors: TreeAccessors<TRow> = useMemo(
    () => ({ getRowId, getChildren, hasChildren }),
    [getRowId, getChildren, hasChildren],
  );

  // No `flexRender`-as-component-type layer standing between this component
  // and every render (unlike `<DataGrid>`, which is why IT needs a ref
  // indirection — see `useEditingState`'s own doc), so `editingState.ctx`
  // (the plain, freshly-computed-each-render value) is read directly below,
  // not through `editingState.ctxRef`.
  const editingState = useEditingState(editing, getRowId);

  const { expanded, childrenMap, loadingIds, errorIds, toggleExpand, retry, expandToLevel } = useTreeState({
    data,
    getRowId,
    getChildren,
    hasChildren,
    onLoadChildren,
    expanded: controlledExpanded,
    onExpandedChange,
    childrenMap: controlledChildrenMap,
    onChildrenMapChange,
    locale,
  });

  // Runs exactly once, against the tree as it existed on first render — not
  // re-triggered by later `data`/`initialExpandedLevel` changes, matching
  // `useTreeState`'s "no implicit reset" stance (see its module doc): a
  // caller that wants a fresh auto-expand for genuinely different data
  // should remount via a `key` prop, not rely on this effect re-firing.
  const didAutoExpand = useRef(false);
  useEffect(() => {
    if (didAutoExpand.current) return;
    didAutoExpand.current = true;
    if (initialExpandedLevel > 0) void expandToLevel(initialExpandedLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sort/filter only run when the caller controls them (see `gridState`'s doc).
  const viewEnabled = gridState !== undefined && onGridStateChange !== undefined;
  // Accessors are often inline lambdas; reading them through a ref keeps the
  // whole-tree filter from re-running on every render (e.g. each scroll tick).
  const viewInputsRef = useRef({ getRowId, getChildren, columns });
  viewInputsRef.current = { getRowId, getChildren, columns };
  const viewed = useMemo(
    () =>
      viewEnabled && (gridState.filter || gridState.sort.length > 0)
        ? filterSortTree(data, gridState, { ...viewInputsRef.current, childrenMap })
        : undefined,
    [viewEnabled, gridState, data, childrenMap],
  );
  const viewRoots = viewed?.roots ?? data;
  const viewChildren = viewed?.childrenMap ?? childrenMap;
  // Ancestors of a match open automatically; one the user collapses stays
  // collapsed until the filter changes.
  const filterKey = JSON.stringify(gridState?.filter ?? null);
  const [collapsedWhileFiltered, setCollapsedWhileFiltered] = useState({ key: filterKey, ids: NO_IDS });
  const collapsedIds = collapsedWhileFiltered.key === filterKey ? collapsedWhileFiltered.ids : NO_IDS;
  const forcedOpenIds = viewed?.expandedIds;
  const viewExpanded = useMemo(() => {
    if (!forcedOpenIds || forcedOpenIds.size === 0) return expanded;
    const merged = { ...expanded };
    for (const id of forcedOpenIds) merged[id] = !collapsedIds.has(id);
    return merged;
  }, [expanded, forcedOpenIds, collapsedIds]);

  function toggleRow(flatRow: FlatTreeRow<TRow>): void {
    if (!forcedOpenIds?.has(flatRow.id)) {
      toggleExpand(flatRow.row);
      return;
    }
    const ids = new Set(collapsedIds);
    if (ids.has(flatRow.id)) ids.delete(flatRow.id);
    else ids.add(flatRow.id);
    setCollapsedWhileFiltered({ key: filterKey, ids });
  }

  const filtersByColumn = useMemo(() => {
    const map = new Map<string, FilterDescriptor>();
    for (const leaf of leafFilters(gridState?.filter)) map.set(fieldKey(leaf.field), leaf);
    return map;
  }, [gridState?.filter]);

  function renderFilterWidget(column: ColumnDef<TRow>): ReactNode {
    const value = filtersByColumn.get(column.id);
    const onChange = (next: FilterDescriptor | undefined): void => {
      if (gridState) onGridStateChange?.({ ...gridState, filter: withColumnFilter(gridState.filter, column.id, next) });
    };
    return column.renderFilter
      ? column.renderFilter(value, onChange, gridState?.filter ?? null)
      : renderDefaultFilterWidget(column, value, onChange);
  }

  // Single source of truth for "which columns actually render", same
  // convention as `<DataGrid>`'s own `visibleColumns` — every other
  // representation below (the header/body column loops, `bodyTdClassByColumn`,
  // `totalColumnCount`) derives from this, not from `columns` directly.
  const visibleColumns = useVisibleColumns(columns, columnVisibility, columnOrder);

  // Needed before `groupedRender` below — which buckets count as "currently
  // visible" depends on which groups are expanded. Shared with `<DataGrid>`'s
  // own `groupBy` support via `useGroupExpansion`.
  const { isGroupExpanded, toggleGroupExpanded } = useGroupExpansion(
    defaultGroupsExpanded,
    controlledExpandedGroups,
    onExpandedGroupsChange,
  );

  // Grouping only ever buckets *root*-level rows (see `groupBy`'s own doc) —
  // each bucket's own rows are still flattened depth-first via the same
  // `flattenTree` every ungrouped render uses, so expand/collapse and lazy
  // loading behave identically either way. `flatRows` itself is skipped
  // entirely when grouped (nothing reads it in that mode, and flattening the
  // whole tree in original — not bucketed — order would be wasted work).
  const flatRows = useMemo(
    () => (groupBy ? [] : flattenTree(viewRoots, accessors, viewExpanded, viewChildren)),
    [groupBy, viewRoots, accessors, viewExpanded, viewChildren],
  );
  const groupedBuckets = useMemo(
    () =>
      groupBy
        ? groupRows(viewRoots, groupBy).map((bucket) => ({
            key: bucket.key,
            roots: bucket.items,
            flatRows: flattenTree(bucket.items, accessors, viewExpanded, viewChildren),
          }))
        : undefined,
    [groupBy, viewRoots, accessors, viewExpanded, viewChildren],
  );
  // Rows belonging to a *collapsed* group are never rendered, so — unlike
  // `<DataGrid>`'s page-scoped "select all on this page" (which has no
  // per-row hide/show mechanic besides pagination) — they must not count as
  // "currently visible" either: `<TreeDataGrid>`'s own selection already
  // excludes a collapsed *tree node*'s descendants from `flatRows`, so a
  // collapsed *group* follows the same rule for consistency. This also gives
  // each rendered row a global (not per-bucket-reset) index via
  // `startIndexByBucket` below, matching what `getRowProps`'s own `index`
  // param documents ("position among the currently visible rows").
  const groupedRender = useMemo(() => {
    if (!groupedBuckets) return undefined;
    const startIndexByBucket = new Map<string, number>();
    const rows: FlatTreeRow<TRow>[] = [];
    for (const bucket of groupedBuckets) {
      if (!isGroupExpanded(bucket.key)) continue;
      startIndexByBucket.set(bucket.key, rows.length);
      rows.push(...bucket.flatRows);
    }
    return { startIndexByBucket, rows };
  }, [groupedBuckets, isGroupExpanded]);
  // Flattened across every *expanded* group when grouped — selection/"select
  // all visible" operate over the whole currently-rendered set regardless of
  // which bucket a row falls in.
  const allFlatRows = groupedRender ? groupedRender.rows : flatRows;

  const treeColId = treeColumnId ?? columns[0]?.id;
  const showRowActionsColumn = Boolean(rowActions?.length);
  const showSelectionColumn = controlledSelectedIds !== undefined;
  const totalColumnCount =
    visibleColumns.length + (showRowActionsColumn ? 1 : 0) + (showSelectionColumn ? 1 : 0);

  // A group-header row sticks right below the real `<thead>` while its
  // members scroll past. Shared with `<DataGrid>`'s own `groupBy` support
  // via `useStickyGroupHeaderTop`.
  const { columnSizing, setColumnSize } = useColumnSizing(controlledColumnSizing, onColumnSizingChange);
  const columnWidthStyle = (column: ColumnDef<TRow>): CSSProperties | undefined => {
    const width = enableColumnResizing ? (columnSizing[column.id] ?? column.width) : column.width;
    return width ? { width } : undefined;
  };

  // With every column explicitly sized and no flexible one (the row-actions column has no
  // width) to take the leftover space, `w-full` would make the browser stretch every
  // column past the width the user dragged it to — so the table is sized to its columns.
  const fixedTableWidth =
    enableColumnResizing && !showRowActionsColumn && visibleColumns.every((c) => columnWidthStyle(c))
      ? visibleColumns.reduce((sum, c) => sum + Number(columnWidthStyle(c)?.width), showSelectionColumn ? SELECTION_COLUMN_WIDTH : 0)
      : undefined;

  const { theadRef, groupHeaderTop } = useStickyGroupHeaderTop(Boolean(groupBy));

  // Optional spanning header row (see `ColumnDef.headerGroup`): both header
  // rows stick, the second one directly below the measured first. A top
  // `totals` row sticks below the last header row the same way.
  const headerRuns = useMemo(() => computeHeaderRuns(visibleColumns), [visibleColumns]);
  const hasHeaderGroups = visibleColumns.some((column) => column.headerGroup);
  const groupRow = useBottomOffset<HTMLTableRowElement>(hasHeaderGroups);
  const leafHeaderRow = useBottomOffset<HTMLTableRowElement>(true);
  const topTotals = totals !== undefined && totalsPosition === "top";
  const bottomTotals = totals !== undefined && totalsPosition === "bottom";
  const topTotalsRow = useBottomOffset<HTMLTableRowElement>(topTotals);
  const cellPad = cellPadding === "compact" ? "px-2 py-0.5" : "p-2";

  // Computed once (not per visible row) over the whole *loaded* tree, not
  // just `flatRows` — see `computeSelectionStates`'s own doc for why a
  // collapsed parent's indeterminate state still depends on children loaded
  // during an earlier expand. Skipped entirely when there's no selection
  // column to show.
  const selectionStates = useMemo(
    () =>
      showSelectionColumn
        ? computeSelectionStates(data, accessors, childrenMap, controlledSelectedIds ?? EMPTY_SELECTED_IDS)
        : undefined,
    [showSelectionColumn, data, accessors, childrenMap, controlledSelectedIds],
  );

  function resolveSelectionState(row: TRow, id: string): RowSelectionState {
    const override = getRowSelectionState?.(row);
    if (override) return { checked: override.checked, indeterminate: override.indeterminate ?? false };
    return selectionStates?.get(id) ?? UNCHECKED_STATE;
  }

  function toggleRowSelected(id: string): void {
    if (!controlledSelectedIds) return;
    const next = new Set(controlledSelectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange?.(next);
  }

  // "Select all" operates on the currently visible (flattened) rows, mirroring
  // <DataGrid>'s own "select all on this page" — and, like there, on raw
  // `selectedIds` membership specifically (not the derived indeterminate
  // view), since `checked` must always stay exactly `selectedIds.has(id)`.
  const selectableFlatRows = useMemo(
    () => allFlatRows.filter((flatRow) => !(isRowSelectionDisabled?.(flatRow.row) ?? false)),
    [allFlatRows, isRowSelectionDisabled],
  );
  const allVisibleSelected =
    showSelectionColumn &&
    selectableFlatRows.length > 0 &&
    selectableFlatRows.every((flatRow) => (controlledSelectedIds as ReadonlySet<string>).has(flatRow.id));

  function toggleAllVisibleSelected(): void {
    if (!controlledSelectedIds) return;
    const next = new Set(controlledSelectedIds);
    for (const flatRow of selectableFlatRows) {
      if (allVisibleSelected) next.delete(flatRow.id);
      else next.add(flatRow.id);
    }
    onSelectedIdsChange?.(next);
  }

  // `alignClassName(column)` only depends on the column, not the row, so
  // resolving it once per column here — instead of via `cn("p-2",
  // alignClassName(column))` inside the per-row `<td>` loop below — turns an
  // O(rows x columns) `cn()`/twMerge call count into O(columns) per render.
  // `"p-2"` and `text-{align}` never conflict (distinct utility groups), so
  // a plain template string is exact, not an approximation.
  const bodyTdClassByColumn = useMemo(() => {
    const map = new Map<string, string>();
    // Fixed layout lets a narrowed column's text paint over its neighbours unless clipped.
    const clip = enableColumnResizing ? "overflow-hidden " : "";
    for (const column of visibleColumns) {
      const base = `${clip}${cellPad} ${alignClassName(column)}`;
      map.set(column.id, column.cellClassName ? cn(base, column.cellClassName) : base);
    }
    return map;
  }, [visibleColumns, enableColumnResizing, cellPad]);

  // Same "entirely opt-in" convention `<DataGrid>`'s own `hasColumnSummary`
  // has — the per-group summary row below and the `showTotals` `<tfoot>`
  // both only render once at least one visible column sets `summary` (see
  // `BaseColumn.summary`'s own doc).
  const hasColumnSummary = visibleColumns.some((column) => column.summary);

  // One `<td>` per visible column for the per-group summary row, each
  // running that column's own `summary(rows)` — `rows` here is always a
  // bucket's own *root* rows (`bucket.roots`), never the flattened tree (see
  // `groupBy`'s own doc for why: a child's value is usually already
  // reflected in its parent's).
  function renderGroupSummaryCells(rows: TRow[]): ReactNode {
    return visibleColumns.map((column) => (
      <td key={column.id} className={cn(bodyTdClassByColumn.get(column.id), "font-medium")}>
        {column.summary?.(rows)}
      </td>
    ));
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  useViewportWidthVar(scrollRef);
  // Interleaving synthetic group-header rows needs a flattened index space
  // to virtualize correctly — out of scope for this pass, so `groupBy`
  // forces virtualization off rather than silently mis-rendering, same as
  // `<DataGrid>`'s own grouped mode.
  const shouldVirtualize = !groupBy && flatRows.length > virtualizeThreshold;
  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  useImperativeHandle(
    apiRef,
    () => ({
      scrollToIndex(index: number): void {
        const box = scrollRef.current;
        if (!box) return;
        if (shouldVirtualize) {
          virtualizer.scrollToIndex(index, { align: "start" });
          return;
        }
        const row = box.querySelector<HTMLElement>(`tr[data-index="${index}"]`);
        if (!row) return;
        box.scrollTop = Math.max(0, row.offsetTop - (topTotals ? topTotalsRow.bottom : leafHeaderRow.bottom));
      },
    }),
    [shouldVirtualize, virtualizer, topTotals, topTotalsRow.bottom, leafHeaderRow.bottom],
  );

  function renderRow(
    flatRow: FlatTreeRow<TRow>,
    index: number,
    measureRef?: (el: Element | null) => void,
  ): ReactElement {
    const rowProps = getRowProps?.(flatRow.row, flatRow.depth, index, {
      expanded: flatRow.isExpanded,
      hasChildren: flatRow.hasChildren,
    });
    const rowTestId = getRowTestId?.(flatRow.row) ?? `tree-row-${flatRow.id}`;
    const isOddRow = zebra && index % 2 === 1;
    const isActive = activeRowId === flatRow.id;
    return (
      <tr
        key={flatRow.id}
        ref={measureRef}
        {...rowProps}
        {...activeRowProps(flatRow.id, activeRowId, onActiveRowChange, rowProps)}
        // Required by `@tanstack/react-virtual`'s `measureElement` (wired
        // below via `measureRef`): it reads this attribute back off the
        // measured node to know which row it just measured. Without it,
        // `indexFromElement` falls back to -1 for every row (logging its own
        // "Missing attribute name 'data-index={index}' on measured element"
        // warning), which the virtualizer's `resizeItem` then discards
        // outright (`index < 0` bails before recording the size) — so a
        // row's real rendered height, e.g. this one growing well past
        // `estimatedRowHeight` once a caller renders an expanded editor
        // inside a cell, never overwrites the estimate. The virtualizer's
        // start/end offsets then drift from the real DOM layout as more
        // dynamically-sized rows accumulate, which can push a still-relevant
        // row out of the computed visible range — unmounting it (and
        // anything with local state/focus inside it) even though it's still
        // meant to be on screen.
        data-index={index}
        data-testid={rowTestId}
        // Same reasoning as <DataGrid>'s own row className: full `cn()`
        // conflict resolution is only needed when a caller-supplied
        // `getRowProps().className` might collide with the zebra stripe's
        // `bg-*` utility — skip straight to a plain string otherwise.
        // Caller's class (then the active wash) after the zebra stripe, so
        // twMerge keeps the caller's `bg-*` on odd rows too.
        className={
          rowProps?.className || isActive
            ? cn(
                "border-b border-border divide-x divide-border",
                isOddRow && "bg-foreground/5",
                rowProps?.className as string | undefined,
                isActive && ACTIVE_ROW_CLASS,
              )
            : `border-b border-border divide-x divide-border${isOddRow ? " bg-foreground/5" : ""}`
        }
      >
        {showSelectionColumn && (
          <td className="p-1" style={{ width: SELECTION_COLUMN_WIDTH }}>
            {(() => {
              const state = resolveSelectionState(flatRow.row, flatRow.id);
              return (
                <Checkbox
                  aria-label={t("grid.selectRow", { id: flatRow.id })}
                  checked={state.indeterminate ? "indeterminate" : state.checked}
                  disabled={isRowSelectionDisabled?.(flatRow.row) ?? false}
                  onCheckedChange={() => toggleRowSelected(flatRow.id)}
                  onClick={stopRowClick}
                />
              );
            })()}
          </td>
        )}
        {visibleColumns.map((column) => (
          <td key={column.id} className={bodyTdClassByColumn.get(column.id)}>
            {column.id === treeColId ? (
              <TreeCell
                flatRow={flatRow}
                column={column}
                indentSize={indentSize}
                isLoading={loadingIds.has(flatRow.id)}
                error={errorIds.get(flatRow.id)}
                labels={labels}
                onToggle={() => toggleRow(flatRow)}
                onRetry={() => retry(flatRow.row)}
                editingCtx={editingState.ctx}
              />
            ) : (
              renderCell(column, flatRow.row, editingState.ctx)
            )}
          </td>
        ))}
        {showRowActionsColumn && rowActions && (
          <td className={cellPad}>
            <ActionsMenu
              items={rowActions}
              ctx={{ row: flatRow.row }}
              triggerLabel={t("grid.rowActionsFor", { id: flatRow.id })}
            />
          </td>
        )}
      </tr>
    );
  }

  // Header cells: shared by the one-row and the two-row (`headerGroup`) layouts.
  // `rowSpan` 2 = spans the group row and the leaf row. Cells in the leaf row of
  // a grouped header stick below the measured group row.
  function renderSelectionHeaderCell(rowSpan: number | undefined): ReactElement {
    return (
      <th
        rowSpan={rowSpan}
        className={cn("sticky top-0 z-20 bg-muted p-1", HEAD_LINE)}
        style={{ width: SELECTION_COLUMN_WIDTH }}
      >
        <Checkbox
          aria-label={t("grid.selectAllVisibleRows")}
          checked={allVisibleSelected}
          onCheckedChange={toggleAllVisibleSelected}
        />
      </th>
    );
  }

  function renderRowActionsHeaderCell(rowSpan: number | undefined): ReactElement {
    return (
      <th
        rowSpan={rowSpan}
        className={cn("sticky top-0 z-20 bg-muted", HEAD_LINE, cellPad)}
        aria-label={t("grid.rowActions")}
      />
    );
  }

  function renderHeaderCell(column: ColumnDef<TRow>, rowSpan: number | undefined): ReactElement {
    const sortEntry = gridState?.sort.find((s) => s.field === column.id);
    const sortable = viewEnabled && isSortable(column);
    const labelId = `tree-header-${column.id}-label`;
    const inLeafRowOfGroups = hasHeaderGroups && column.headerGroup !== undefined;
    return (
      <th
        key={column.id}
        rowSpan={rowSpan}
        style={{ ...columnWidthStyle(column), ...(inLeafRowOfGroups ? { top: groupRow.bottom } : undefined) }}
        className={cn(
          "sticky top-0 z-20 bg-muted font-medium",
          HEAD_LINE,
          cellPad,
          enableColumnResizing && "overflow-hidden",
          alignClassName(column),
          column.headerClassName,
        )}
        aria-sort={sortable ? sortDirToAriaSort(sortEntry?.dir) : undefined}
        aria-labelledby={viewEnabled ? labelId : undefined}
      >
        {viewEnabled && gridState ? (
          <HeaderCellContent
            column={column}
            labelId={labelId}
            sortDir={sortEntry?.dir}
            onToggleSort={
              sortable
                ? (event) =>
                    onGridStateChange?.({
                      ...gridState,
                      sort: withToggledSort(gridState.sort, column.id, enableMultiSort && event.shiftKey, column.sortDescFirst === true),
                    })
                : undefined
            }
            renderFilter={isFilterable(column) ? () => renderFilterWidget(column) : undefined}
            filterActive={filtersByColumn.has(column.id)}
            filterTriggerTestId={filterTriggerTestId?.(column.id)}
          />
        ) : (
          column.header
        )}
        {enableColumnResizing && (
          <ColumnResizeHandle columnId={column.id} label={String(column.header)}
            width={columnSizing[column.id] ?? column.width}
            onResize={setColumnSize} />
        )}
      </th>
    );
  }

  // The pre-computed `totals` row: every visible column's own cell renderer,
  // pinned under the header (top, inside the thead) or to the bottom edge.
  function renderTotalsRow(position: "top" | "bottom"): ReactElement {
    const top = position === "top";
    const pinStyle: CSSProperties | undefined = top ? { top: leafHeaderRow.bottom } : undefined;
    const pinClass = cn("sticky z-20 bg-muted", top ? HEAD_LINE : cn("bottom-0", FOOT_LINE));
    const { className: extraClassName, ...restRowProps } = totalsRowProps ?? {};
    return (
      <tr
        ref={top ? topTotalsRow.ref : undefined}
        data-testid="totals-row"
        {...restRowProps}
        className={cn("divide-x divide-border", extraClassName as string | undefined)}
      >
        {showSelectionColumn && (
          <td className={cn(pinClass, cellPad)} style={{ width: SELECTION_COLUMN_WIDTH, ...pinStyle }} />
        )}
        {visibleColumns.map((column) => (
          <td
            key={column.id}
            style={{ ...columnWidthStyle(column), ...pinStyle }}
            className={cn(
              pinClass,
              "font-medium",
              cellPad,
              enableColumnResizing && "overflow-hidden",
              alignClassName(column),
              column.cellClassName,
            )}
          >
            {renderCell(column, totals as TRow, undefined)}
          </td>
        ))}
        {showRowActionsColumn && <td className={cn(pinClass, cellPad)} style={pinStyle} aria-hidden />}
      </tr>
    );
  }

  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : [];
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end : 0;

  return (
    <BmsLocaleProvider locale={i18n.locale}>
    <FilterLabelsProvider labels={filterLabels}>
    {/* `h-full`/`min-h-0` only matter inside a bounded parent — that's what
        lets `maxBodyHeight="100%"` fill it, same as `<DataGrid>`'s wrappers. */}
    <div className="flex h-full min-h-0 flex-col gap-2" data-testid="tree-datagrid">
      {hasError && data.length > 0 && (
        <div className="flex shrink-0 items-center rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1">
          <GridInlineError error={error} onRetry={onRetry} labels={labels} wrap />
        </div>
      )}
      {editing && editingState.pendingEdits.size > 0 && (
        <EditingBar
          editing={editing}
          pendingRowCount={editingState.pendingEdits.size}
          editErrors={editingState.editErrors}
          onSave={() => void editingState.handleSaveEdits()}
          onDiscard={editingState.handleDiscardEdits}
          testIdPrefix="tree-datagrid"
        />
      )}
      <div
        ref={scrollRef}
        data-testid={testId}
        // Scrollability must not depend on whether the virtualizer is
        // active: `shouldVirtualize` only decides whether rows are windowed
        // (an unrelated performance optimization gated on `virtualizeThreshold`,
        // and always off for `groupBy`, see its own comment above) -- a tree
        // whose row count stays under that threshold, or that groups its
        // rows, can still overflow `maxBodyHeight` and needs the exact same
        // scroll box to reach the rest of it. Previously this div only got
        // its overflow-y-auto/maxHeight styling once virtualization kicked
        // in, so a non-virtualized (or grouped) tree that outgrew its box
        // just rendered past it with no way to scroll to what was clipped.
        className="min-h-0 overflow-y-auto"
        style={{ maxHeight: maxBodyHeight }}
      >
        <table
          {...tableProps}
          data-fixed-layout={enableColumnResizing ? "" : undefined}
          className={cn(
            "border-collapse text-sm",
            fixedTableWidth === undefined && "w-full",
            enableColumnResizing && "table-fixed",
            tableProps?.className as string | undefined,
          )}
          style={fixedTableWidth === undefined ? undefined : { width: fixedTableWidth }}
        >
          <thead ref={theadRef}>
            {hasHeaderGroups && (
              <tr ref={groupRow.ref} data-testid="header-group-row" className="divide-x divide-border">
                {showSelectionColumn && renderSelectionHeaderCell(2)}
                {headerRuns.map((run) =>
                  run.kind === "single" ? (
                    renderHeaderCell(run.column, 2)
                  ) : (
                    <th
                      key={`group-${run.label}-${run.columns[0]!.id}`}
                      colSpan={run.columns.length}
                      className={cn("sticky top-0 z-20 bg-muted text-center font-medium", HEAD_LINE, cellPad)}
                    >
                      {run.label}
                    </th>
                  ),
                )}
                {showRowActionsColumn && renderRowActionsHeaderCell(2)}
              </tr>
            )}
            <tr ref={leafHeaderRow.ref} className="divide-x divide-border">
              {!hasHeaderGroups && showSelectionColumn && renderSelectionHeaderCell(undefined)}
              {visibleColumns.map((column) => (hasHeaderGroups && !column.headerGroup ? null : renderHeaderCell(column, undefined)))}
              {!hasHeaderGroups && showRowActionsColumn && renderRowActionsHeaderCell(undefined)}
            </tr>
            {topTotals && renderTotalsRow("top")}
          </thead>
          {/* One `<tbody>` per group, with the sticky on the header `<tr>`: a sticky row is bounded by its tbody (a sticky `<td>` is bounded by the whole table),
              so each group header is pushed out by the next instead of all of them piling up under the column header. */}
          {groupedBuckets && viewRoots.length > 0 ? (
            groupedBuckets.map((bucket) => {
              const groupExpanded = isGroupExpanded(bucket.key);
              return (
                <tbody key={`group-${bucket.key}`}>
                  {/* Own background + 1px overlap under the header: a fractional header height (36.5px) otherwise leaves a sliver where the rows below show through. */}
                  <tr
                    data-testid={`group-header-${bucket.key}`}
                    className={cn("sticky z-[19]", zebra ? "bg-muted" : "bg-background")}
                    style={{ top: Math.max(0, groupHeaderTop - 1) }}
                  >
                    <td
                      colSpan={totalColumnCount}
                      className={cn("border-b p-2 font-medium", zebra ? "bg-muted" : "bg-background")}
                    >
                      <button
                        type="button"
                        className="sticky left-2 flex w-[calc(var(--dg-viewport-w,100%_+_1rem)_-_1rem)] max-w-full items-center gap-1 text-left"
                        onClick={() => toggleGroupExpanded(bucket.key)}
                        aria-expanded={groupExpanded}
                      >
                        <ChevronRightIcon
                          className={`h-4 w-4 shrink-0 transition-transform${groupExpanded ? " rotate-90" : ""}`}
                          aria-hidden
                        />
                        {renderGroupHeader
                          ? renderGroupHeader(bucket.key, bucket.roots, groupExpanded)
                          : `${bucket.key} (${bucket.roots.length})`}
                      </button>
                    </td>
                  </tr>
                  {/* Not sticky, unlike the label row above — scrolls away
                      with this group's own rows. Rendered regardless of
                      `groupExpanded`, same as `<DataGrid>`'s own group
                      summary row: a collapsed group's subtotal is often
                      the whole reason to collapse it. */}
                  {hasColumnSummary && (
                    <tr
                      data-testid={`group-summary-${bucket.key}`}
                      className="border-b border-border divide-x divide-border"
                    >
                      {showSelectionColumn && (
                        <td
                          className={cn("p-2", zebra ? "bg-muted" : "bg-background")}
                          style={{ width: SELECTION_COLUMN_WIDTH }}
                        />
                      )}
                      {renderGroupSummaryCells(bucket.roots)}
                      {showRowActionsColumn && (
                        <td className={cn("p-2", zebra ? "bg-muted" : "bg-background")} aria-hidden />
                      )}
                    </tr>
                  )}
                  {groupExpanded &&
                    (() => {
                      const startIndex = groupedRender?.startIndexByBucket.get(bucket.key) ?? 0;
                      return bucket.flatRows.map((flatRow, i) => renderRow(flatRow, startIndex + i));
                    })()}
                </tbody>
              );
            })
          ) : (
          <tbody>
            {viewRoots.length === 0 ? (
              <tr>
                <td colSpan={totalColumnCount} className="p-4 text-center text-muted-foreground">
                  <div className="sticky left-4 w-[calc(var(--dg-viewport-w,100%_+_2rem)_-_2rem)] max-w-full">
                    {loading ? (
                      <LoadingRows label={labels.loading} />
                    ) : hasError ? (
                      <GridErrorState error={error} onRetry={onRetry} labels={labels} />
                    ) : (
                      labels.noResults
                    )}
                  </div>
                </td>
              </tr>
            ) : shouldVirtualize ? (
              <>
                {paddingTop > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={totalColumnCount} style={{ padding: 0, border: "none", height: paddingTop }} />
                  </tr>
                )}
                {virtualItems.map((virtualItem) =>
                  renderRow(flatRows[virtualItem.index]!, virtualItem.index, (el) => virtualizer.measureElement(el)),
                )}
                {paddingBottom > 0 && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={totalColumnCount}
                      style={{ padding: 0, border: "none", height: paddingBottom }}
                    />
                  </tr>
                )}
              </>
            ) : (
              flatRows.map((flatRow, index) => renderRow(flatRow, index))
            )}
          </tbody>
          )}
          {bottomTotals ? (
            <tfoot>{renderTotalsRow("bottom")}</tfoot>
          ) : showTotals && hasColumnSummary && (
            // Sticky to the BOTTOM of the scroll container, mirroring the
            // `<thead>`'s own `top-0` stickiness — see `<DataGrid>`'s own
            // `renderTotalsFooter` for the full reasoning. Summarizes `data`
            // (the root-level rows), not `flatRows`/`allFlatRows` — same
            // "roots only" scope `groupBy` itself uses, and for the same
            // reason (a child's value is usually already folded into its
            // parent's).
            <tfoot>
              <tr data-testid="totals-row" className="divide-x divide-border">
                {showSelectionColumn && (
                  <td
                    className="sticky bottom-0 z-20 border-t border-border bg-muted p-2"
                    style={{ width: SELECTION_COLUMN_WIDTH }}
                  />
                )}
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    style={columnWidthStyle(column)}
                    className={cn(
                      "sticky bottom-0 z-20 border-t border-border bg-muted font-medium",
                      cellPad,
                      enableColumnResizing && "overflow-hidden",
                      alignClassName(column),
                      column.cellClassName,
                    )}
                  >
                    {column.summary?.(viewRoots)}
                  </td>
                ))}
                {showRowActionsColumn && (
                  <td className="sticky bottom-0 z-20 border-t border-border bg-muted p-2" aria-hidden />
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
    </FilterLabelsProvider>
    </BmsLocaleProvider>
  );
}
