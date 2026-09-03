import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Fragment, useEffect, useMemo, useRef } from "react";
import { alignClassName } from "../column/format";
import type { ColumnDef } from "../column/types";
import { getColumnValue } from "../column/types";
import { Checkbox } from "../components/ui/checkbox";
import { EditingBar } from "../edit/EditingBar";
import type { EditingCellContext } from "../edit/editingState";
import { useEditingState } from "../edit/editingState";
import { renderEditableCell } from "../edit/renderEditableCell";
import { groupRows } from "../grid/groupRows";
import { useGroupExpansion } from "../hooks/useGroupExpansion";
import { useStickyGroupHeaderTop } from "../hooks/useStickyGroupHeaderTop";
import { useVisibleColumns } from "../hooks/useVisibleColumns";
import { SELECTION_COLUMN_WIDTH } from "../lib/structuralColumns";
import { cn, stopRowClick } from "../lib/utils";
import { ActionsMenu } from "../menu/ActionsMenu";
import type { FlatTreeRow } from "./flattenTree";
import { flattenTree } from "./flattenTree";
import { computeSelectionStates } from "./selectionState";
import type { RowSelectionState } from "./selectionState";
import type { TreeAccessors, TreeDataGridProps } from "./types";
import { useTreeState } from "./useTreeState";

const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();
const UNCHECKED_STATE: RowSelectionState = { checked: false, indeterminate: false };

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
  onToggle,
  onRetry,
  editingCtx,
}: TreeCellProps<TRow>): ReactElement {
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
          aria-label={flatRow.isExpanded ? "Collapse" : "Expand"}
          aria-expanded={flatRow.isExpanded}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : flatRow.isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
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
        <span className="ml-1 flex shrink-0 items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          Failed to load.
          <button type="button" className="underline underline-offset-2" onClick={onRetry}>
            Retry
          </button>
        </span>
      ) : null}
    </div>
  );
}

/**
 * A lazy-loading tree grid: generalizes a consuming app's contract tree list
 * (a from-scratch hand-rolled hierarchy table with no shared abstraction)
 * into a reusable component on top of the same `ColumnDef<TRow>` system
 * `<DataGrid>` uses. Deliberately does NOT support sorting or client-side
 * filtering — that original hierarchy table has neither (hierarchy order
 * comes from the backend; "filtering" there means asking the server for a
 * differently-shaped tree, which is an app-level concern, not something
 * this component can generalize).
 *
 * Row indentation + the expand/collapse chevron are prepended to whichever
 * column's cell matches `treeColumnId` (defaults to `columns[0]`); every
 * other column renders exactly like it would in `<DataGrid>`.
 */
export function TreeDataGrid<TRow>({
  columns,
  data,
  treeColumnId,
  columnVisibility,
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
  editing,
}: TreeDataGridProps<TRow>): ReactElement {
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

  // Single source of truth for "which columns actually render", same
  // convention as `<DataGrid>`'s own `visibleColumns` — every other
  // representation below (the header/body column loops, `bodyTdClassByColumn`,
  // `totalColumnCount`) derives from this, not from `columns` directly.
  const visibleColumns = useVisibleColumns(columns, columnVisibility);

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
    () => (groupBy ? [] : flattenTree(data, accessors, expanded, childrenMap)),
    [groupBy, data, accessors, expanded, childrenMap],
  );
  const groupedBuckets = useMemo(
    () =>
      groupBy
        ? groupRows(data, groupBy).map((bucket) => ({
            key: bucket.key,
            roots: bucket.items,
            flatRows: flattenTree(bucket.items, accessors, expanded, childrenMap),
          }))
        : undefined,
    [groupBy, data, accessors, expanded, childrenMap],
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
  const { theadRef, groupHeaderTop } = useStickyGroupHeaderTop(Boolean(groupBy));

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
    for (const column of visibleColumns) map.set(column.id, `p-2 ${alignClassName(column)}`);
    return map;
  }, [visibleColumns]);

  const scrollRef = useRef<HTMLDivElement>(null);
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

  function renderRow(
    flatRow: FlatTreeRow<TRow>,
    index: number,
    measureRef?: (el: Element | null) => void,
  ): ReactElement {
    const rowProps = getRowProps?.(flatRow.row, flatRow.depth, index);
    const rowTestId = getRowTestId?.(flatRow.row) ?? `tree-row-${flatRow.id}`;
    const isOddRow = zebra && index % 2 === 1;
    return (
      <tr
        key={flatRow.id}
        ref={measureRef}
        {...rowProps}
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
        className={
          rowProps?.className
            ? cn(
                "border-b border-border divide-x divide-border",
                rowProps.className as string,
                isOddRow && "bg-foreground/5",
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
                  aria-label={`Select row ${flatRow.id}`}
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
                onToggle={() => toggleExpand(flatRow.row)}
                onRetry={() => retry(flatRow.row)}
                editingCtx={editingState.ctx}
              />
            ) : (
              renderCell(column, flatRow.row, editingState.ctx)
            )}
          </td>
        ))}
        {showRowActionsColumn && rowActions && (
          <td className="p-2">
            <ActionsMenu
              items={rowActions}
              ctx={{ row: flatRow.row }}
              triggerLabel={`Row actions for ${flatRow.id}`}
            />
          </td>
        )}
      </tr>
    );
  }

  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : [];
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end : 0;

  return (
    <div className="flex flex-col gap-2" data-testid="tree-datagrid">
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
        className={shouldVirtualize ? "overflow-y-auto" : undefined}
        style={shouldVirtualize ? { maxHeight: maxBodyHeight } : undefined}
      >
        <table className="w-full border-collapse text-sm">
          <thead ref={theadRef}>
            <tr className="divide-x divide-border">
              {showSelectionColumn && (
                <th
                  className="sticky top-0 z-20 border-b border-border bg-muted p-1"
                  style={{ width: SELECTION_COLUMN_WIDTH }}
                >
                  <Checkbox
                    aria-label="Select all visible rows"
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAllVisibleSelected}
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    "sticky top-0 z-20 border-b border-border bg-muted p-2 font-medium",
                    alignClassName(column),
                  )}
                >
                  {column.header}
                </th>
              ))}
              {showRowActionsColumn && (
                <th className="sticky top-0 z-20 border-b border-border bg-muted p-2" aria-label="Row actions" />
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={totalColumnCount} className="p-4 text-center text-muted-foreground">
                  No results.
                </td>
              </tr>
            ) : groupedBuckets ? (
              groupedBuckets.map((bucket) => {
                const groupExpanded = isGroupExpanded(bucket.key);
                return (
                  <Fragment key={`group-${bucket.key}`}>
                    <tr data-testid={`group-header-${bucket.key}`}>
                      <td
                        colSpan={totalColumnCount}
                        className={cn(
                          "sticky z-20 border-b p-2 font-medium",
                          zebra ? "bg-muted" : "bg-background",
                        )}
                        style={{ top: groupHeaderTop }}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-1 text-left"
                          onClick={() => toggleGroupExpanded(bucket.key)}
                          aria-expanded={groupExpanded}
                        >
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 transition-transform${groupExpanded ? " rotate-90" : ""}`}
                            aria-hidden
                          />
                          {renderGroupHeader
                            ? renderGroupHeader(bucket.key, bucket.roots, groupExpanded)
                            : `${bucket.key} (${bucket.roots.length})`}
                        </button>
                      </td>
                    </tr>
                    {groupExpanded &&
                      (() => {
                        const startIndex = groupedRender?.startIndexByBucket.get(bucket.key) ?? 0;
                        return bucket.flatRows.map((flatRow, i) => renderRow(flatRow, startIndex + i));
                      })()}
                  </Fragment>
                );
              })
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
        </table>
      </div>
    </div>
  );
}
