import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { alignClassName, defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { getColumnValue } from "../column/types";
import { Checkbox } from "../components/ui/checkbox";
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

function renderCell<TRow>(column: ColumnDef<TRow>, row: TRow): ReactNode {
  const value = getColumnValue(column, row);
  return column.cell ? column.cell(value, row) : defaultFormat(column, value);
}

interface TreeCellProps<TRow> {
  flatRow: FlatTreeRow<TRow>;
  column: ColumnDef<TRow>;
  indentSize: number;
  isLoading: boolean;
  error: string | undefined;
  onToggle: () => void;
  onRetry: () => void;
}

function TreeCell<TRow>({
  flatRow,
  column,
  indentSize,
  isLoading,
  error,
  onToggle,
  onRetry,
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
      <span className="truncate">{renderCell(column, flatRow.row)}</span>
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
  getRowId,
  getChildren,
  hasChildren,
  onLoadChildren,
  initialExpandedLevel = 0,
  expanded: controlledExpanded,
  onExpandedChange,
  indentSize = 20,
  getRowProps,
  getRowTestId,
  rowActions,
  virtualizeThreshold = 100,
  estimatedRowHeight = 40,
  maxBodyHeight = 480,
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
  getRowSelectionState,
  isRowSelectionDisabled,
}: TreeDataGridProps<TRow>): ReactElement {
  const accessors: TreeAccessors<TRow> = useMemo(
    () => ({ getRowId, getChildren, hasChildren }),
    [getRowId, getChildren, hasChildren],
  );

  const { expanded, childrenMap, loadingIds, errorIds, toggleExpand, retry, expandToLevel } = useTreeState({
    data,
    getRowId,
    getChildren,
    hasChildren,
    onLoadChildren,
    expanded: controlledExpanded,
    onExpandedChange,
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

  const flatRows = useMemo(
    () => flattenTree(data, accessors, expanded, childrenMap),
    [data, accessors, expanded, childrenMap],
  );

  const treeColId = treeColumnId ?? columns[0]?.id;
  const showRowActionsColumn = Boolean(rowActions?.length);
  const showSelectionColumn = controlledSelectedIds !== undefined;
  const totalColumnCount = columns.length + (showRowActionsColumn ? 1 : 0) + (showSelectionColumn ? 1 : 0);

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
    () => flatRows.filter((flatRow) => !(isRowSelectionDisabled?.(flatRow.row) ?? false)),
    [flatRows, isRowSelectionDisabled],
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
    for (const column of columns) map.set(column.id, `p-2 ${alignClassName(column)}`);
    return map;
  }, [columns]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = flatRows.length > virtualizeThreshold;
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
    return (
      <tr
        key={flatRow.id}
        ref={measureRef}
        {...rowProps}
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
                index % 2 === 1 && "bg-foreground/5",
              )
            : `border-b border-border divide-x divide-border${index % 2 === 1 ? " bg-foreground/5" : ""}`
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
        {columns.map((column) => (
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
              />
            ) : (
              renderCell(column, flatRow.row)
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
      <div
        ref={scrollRef}
        className={shouldVirtualize ? "overflow-y-auto" : undefined}
        style={shouldVirtualize ? { maxHeight: maxBodyHeight } : undefined}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="divide-x divide-border">
              {showSelectionColumn && (
                <th className="border-b border-border p-1" style={{ width: SELECTION_COLUMN_WIDTH }}>
                  <Checkbox
                    aria-label="Select all visible rows"
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAllVisibleSelected}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.id}
                  style={column.width ? { width: column.width } : undefined}
                  className={`border-b border-border p-2 font-medium ${alignClassName(column)}`}
                >
                  {column.header}
                </th>
              ))}
              {showRowActionsColumn && <th className="border-b border-border p-2" aria-label="Row actions" />}
            </tr>
          </thead>
          <tbody>
            {flatRows.length === 0 ? (
              <tr>
                <td colSpan={totalColumnCount} className="p-4 text-center text-muted-foreground">
                  No results.
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
        </table>
      </div>
    </div>
  );
}
