import type { ReactNode } from "react";
import { defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { getColumnValue, isEditable } from "../column/types";
import { stopRowClick } from "../lib/utils";
import type { EditingCellContext } from "./editingState";
import { renderDefaultEditWidget } from "./registry";

/**
 * Renders one cell for a column that may or may not be `editable`, given the
 * live editing context (or `undefined` when no `editing` prop was supplied
 * at all). Shared by `<DataGrid>` and `<TreeDataGrid>` so the click-to-
 * activate/Escape-to-revert/autoFocus behavior — and its bug fixes — only
 * exist in one place; see `useEditingState`'s own module doc.
 *
 * Not itself responsible for choosing WHICH raw value to start from
 * (`<DataGrid>` reads it off TanStack's `CellContext.getValue()`,
 * `<TreeDataGrid>` off a plain accessor) — callers pass `rawValue` in.
 */
export function renderEditableCell<TRow>(
  column: ColumnDef<TRow>,
  row: TRow,
  rawValue: unknown,
  ctx: EditingCellContext<TRow> | undefined,
): ReactNode {
  const staticContent = (value: unknown): ReactNode =>
    column.cell ? column.cell(value, row) : defaultFormat(column, value);
  if (!ctx || !isEditable(column, row)) return staticContent(rawValue);

  const rowId = ctx.getRowId(row);
  // A pending edit on this cell wins over the row's real data regardless of
  // whether the row is currently active — switching to another row (only
  // one is ever active at a time) must not make an already-typed value look
  // reverted/lost just because its editor isn't on screen anymore; it's
  // still fully pending and will still be included in Save.
  const pendingRow = ctx.pendingEdits.get(rowId);
  const value = pendingRow?.values.has(column.id) ? pendingRow.values.get(column.id) : rawValue;

  if (ctx.activeRowId === rowId) {
    const error = ctx.editErrors.get(rowId)?.get(column.id);
    const autoFocus = ctx.autoFocusTarget?.rowId === rowId && ctx.autoFocusTarget.columnId === column.id;
    const onChange = (next: unknown): void => ctx.onEdit(column, row, next);
    const editor = column.renderEditCell
      ? column.renderEditCell(value, row, onChange, error, autoFocus)
      : renderDefaultEditWidget(column, rowId, value, onChange, error, autoFocus);
    // Escape reverts this ONE cell back to its original (never-edited)
    // value — not a multi-step undo back through every prior edit this
    // session, just "give up on what I just typed here." A plain
    // `onKeyDown` here (rather than plumbing it through every default
    // editor + `renderEditCell`) works because the key event bubbles up
    // from whatever native control the editor renders; the row itself
    // stays active (only this cell's value changes) — deactivating the
    // whole row on Escape would also discard sibling cells' edits the user
    // had no intention of touching.
    return (
      <div
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          // The default EnumEditor's Radix <Select> (or any custom
          // `renderEditCell` popover/dropdown) is a REACT descendant of
          // this `<div>` — so its synthetic events still bubble up to this
          // handler — but its actual DOM node lives in a portal OUTSIDE
          // this `<div>`. Radix's own Escape-closes-the-dropdown handling
          // doesn't stopPropagation, so without this real-DOM containment
          // check, pressing Escape just to close an open dropdown would
          // ALSO silently revert whatever this cell already had selected.
          if (!event.currentTarget.contains(event.target as Node)) return;
          event.stopPropagation();
          ctx.onEdit(column, row, getColumnValue(column, row));
        }}
      >
        {editor}
      </div>
    );
  }

  // Not yet activated: static content, but a click on it (any editable
  // column's cell) activates every editable column in this row at once —
  // see `EditingCellContext.activeRowId`'s own doc. `role`/`tabIndex` make
  // this keyboard-reachable (Enter/Space) too, not just clickable.
  return (
    <span
      role="button"
      tabIndex={0}
      data-testid={`cell-${rowId}-${column.id}`}
      className="block w-full cursor-text"
      onClick={(event) => {
        stopRowClick(event);
        ctx.onActivateRow(rowId, column.id);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        stopRowClick(event);
        ctx.onActivateRow(rowId, column.id);
      }}
    >
      {staticContent(value)}
    </span>
  );
}
