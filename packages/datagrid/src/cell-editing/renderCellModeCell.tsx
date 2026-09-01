import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { isEditable } from "../column/types";
import { renderDefaultEditWidget } from "../edit/registry";
import type { CellEditingCellContext } from "./useCellEditingState";

/**
 * Column types whose default editor's `onChange` fires once per COMPLETE
 * selection (choosing an enum option, toggling a boolean, picking a date) —
 * for these, that single `onChange` call commits immediately, matching
 * Excel's own behavior for a dropdown/checkbox cell. `string`/`number`/
 * `currency` fire `onChange` once per KEYSTROKE instead, so committing on
 * every one of those would mean one `onCellsChange` call per character
 * typed — those buffer locally via `onChangeDraft` and commit separately, on
 * blur or Enter/Tab (see `renderCellModeCell`'s own logic below).
 */
type ColumnTypeLiteral = "string" | "number" | "currency" | "date" | "datetime" | "boolean" | "enum";

function isAtomicEditorType(type: ColumnTypeLiteral): boolean {
  return type === "enum" || type === "boolean" || type === "date" || type === "datetime";
}

/**
 * Renders one cell under `cellEditing` mode — the immediate-apply
 * counterpart to `edit/renderEditableCell.tsx`'s accumulate-then-save one.
 * Reuses the exact same per-type editor widgets via `registry.tsx`'s
 * `renderDefaultEditWidget` (and the same `column.renderEditCell`/
 * `column.validateEdit` escape hatches) — only the commit semantics differ.
 *
 * Not responsible for range-selection visuals — that's `SelectionOverlay`,
 * one overlay for the whole grid — this only decides whether THIS cell is
 * the one currently showing its editor.
 */
export function renderCellModeCell<TRow>(
  column: ColumnDef<TRow>,
  row: TRow,
  rawValue: unknown,
  ctx: CellEditingCellContext<TRow> | undefined,
): ReactNode {
  const staticContent = (value: unknown): ReactNode => (column.cell ? column.cell(value, row) : defaultFormat(column, value));
  if (!ctx) return staticContent(rawValue);

  const rowId = ctx.getRowId(row);
  const value = ctx.resolveValue(rowId, column.id, rawValue);
  const isThisCellEditing = ctx.editingCell?.rowId === rowId && ctx.editingCell.columnId === column.id && isEditable(column, row);

  if (!isThisCellEditing) {
    return (
      <span data-testid={`cell-${rowId}-${column.id}`} className="block w-full">
        {staticContent(value)}
      </span>
    );
  }

  const isAtomic = isAtomicEditorType(column.type);
  const error = ctx.getError(rowId, column.id);
  const startValue = ctx.initialText !== undefined ? ctx.initialText : value;
  const currentValue = ctx.hasDraft ? ctx.draftValue : startValue;

  function validate(candidate: unknown): string | undefined {
    return column.validateEdit?.(candidate, row);
  }

  const onChange = (next: unknown): void => {
    const message = validate(next);
    ctx!.onSetError(rowId, column.id, message);
    // `onCommitValue` (not `onChangeDraft` + `onCommitEdit`) for the atomic
    // path: `onCommitEdit` reads `hasDraft`/`draftValue` from React state,
    // which a same-tick `onChangeDraft` call immediately before it would NOT
    // yet reflect — state updates apply on the next render, not before the
    // current handler returns. `onCommitValue` takes the new value directly,
    // sidestepping that entirely.
    if (isAtomic && !message) {
      // `value` (resolveValue's result), not `rawValue` — a still-fresh
      // override from an immediately-prior edit this session must be the
      // reported `previousValue`, not the underlying row data it's
      // temporarily masking (see `resolveValue`'s own doc).
      ctx!.onCommitValue(row, value, next);
      return;
    }
    // Buffered types always land here; an atomic type only does when its
    // selection was invalid — shown (with its error) but not committed, via
    // the same draft slot buffered types use, so the invalid choice stays
    // visible instead of snapping back to the pre-edit value.
    ctx!.onChangeDraft(next);
  };

  const editor = column.renderEditCell
    ? column.renderEditCell(currentValue, row, onChange, error, true)
    : renderDefaultEditWidget(column, rowId, currentValue, onChange, error, true);

  // Buffered (string/number/currency) editors only: Enter/Tab attempts a
  // commit-and-continue; a validation failure blocks it (stops the event
  // from reaching <DataGrid>'s own Enter/Tab-navigates handler) so the user
  // stays on the broken cell instead of silently losing what they typed.
  // Escape always reverts, for every editor type — same one-cell-only
  // revert semantics `renderEditableCell.tsx` documents for row mode.
  function handleKeyDown(event: ReactKeyboardEvent): void {
    if (event.key === "Escape") {
      event.stopPropagation();
      ctx!.onCancelEdit();
      return;
    }
    // A multiline column's own Shift+Enter is left alone entirely — the
    // textarea's native default inserts a literal newline, matching real
    // spreadsheet multiline-cell editing (plain Enter still commits and
    // moves down, same as every other buffered editor).
    const isMultilineNewline = column.type === "string" && column.multiline && event.key === "Enter" && event.shiftKey;
    if (isMultilineNewline) return;
    if (isAtomic || (event.key !== "Enter" && event.key !== "Tab")) return;
    const message = validate(currentValue);
    if (message) {
      event.stopPropagation();
      return;
    }
    ctx!.onCommitEdit(row, value);
    // Deliberately NOT stopped: <DataGrid>'s own keydown handler on the
    // scroll container sees this same Enter/Tab afterward and moves the
    // selection cursor to the next cell — this cell is no longer "editing"
    // by the time that happens (onCommitEdit just closed it), so the two
    // handlers compose into exactly "commit, then move," not a conflict.
  }

  // Buffered editors only: clicking away commits a valid draft, or reverts
  // an invalid one — there's no way to keep the editor open once focus has
  // already left it, so "block the blur" (Enter/Tab's option) isn't
  // available here.
  function handleBlur(): void {
    if (isAtomic) return;
    if (validate(currentValue)) ctx!.onCancelEdit();
    else ctx!.onCommitEdit(row, value);
  }

  return (
    <div onKeyDown={handleKeyDown} onBlur={handleBlur}>
      {editor}
    </div>
  );
}
