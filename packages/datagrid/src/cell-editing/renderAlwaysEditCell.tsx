import { useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { isEditable } from "../column/types";
import { renderDefaultEditWidget } from "../edit/registry";
import { isAtomicEditorType } from "./renderCellModeCell";
import type { CellEditingCellContext } from "./useCellEditingState";

/**
 * Renders one cell under `cellEditing.alwaysEdit` mode: every editable cell
 * gets its own permanently-mounted editor, all simultaneously — unlike
 * `renderCellModeCell`'s single shared `editingCell` slot (at most one editor
 * open at a time), this component owns its OWN local draft state, since with
 * every cell independently editable there's no single "the" cell to hang a
 * shared draft off of. A buffered (string/number/currency) editor still only
 * commits on blur/Enter/Tab, same as click-to-edit mode — this only changes
 * WHEN the editor first appears (always, not on click/double-click/F2/typed
 * character), not how a buffered edit gets committed.
 */
export function AlwaysEditCell<TRow>(props: {
  column: ColumnDef<TRow>;
  row: TRow;
  rawValue: unknown;
  ctx: CellEditingCellContext<TRow>;
}): ReactNode {
  const { column, row, rawValue, ctx } = props;
  const rowId = ctx.getRowId(row);
  const resolvedValue = ctx.resolveValue(rowId, column.id, rawValue);

  if (!isEditable(column, row)) {
    return (
      <span data-testid={`cell-${rowId}-${column.id}`} className="block w-full">
        {column.cell ? column.cell(resolvedValue, row) : defaultFormat(column, resolvedValue)}
      </span>
    );
  }

  const isAtomic = isAtomicEditorType(column.type);
  const error = ctx.getError(rowId, column.id);
  // `undefined` means "no local draft yet — show `resolvedValue`," the same
  // convention `hasDraft`/`draftValue` use in the shared, single-cell state
  // this component otherwise replaces. Reset to `undefined` right after a
  // commit (or an Escape-revert) so the next render re-syncs to whatever
  // `resolvedValue` becomes (the just-applied change, or a reverted original).
  const [draft, setDraft] = useState<{ value: unknown } | undefined>(undefined);
  const currentValue = draft ? draft.value : resolvedValue;

  function validate(candidate: unknown): string | undefined {
    return column.validateEdit?.(candidate, row);
  }

  function commit(value: unknown): void {
    ctx.applyChange({ rowId, row, columnId: column.id, previousValue: resolvedValue, value });
    setDraft(undefined);
  }

  const onChange = (next: unknown): void => {
    const message = validate(next);
    ctx.onSetError(rowId, column.id, message);
    if (isAtomic && !message) {
      commit(next);
      return;
    }
    setDraft({ value: next });
  };

  function handleKeyDown(event: ReactKeyboardEvent): void {
    if (event.key === "Escape") {
      event.stopPropagation();
      ctx.onSetError(rowId, column.id, undefined);
      setDraft(undefined);
      return;
    }
    const isMultilineNewline = column.type === "string" && column.multiline && event.key === "Enter" && event.shiftKey;
    if (isMultilineNewline) return;
    if (isAtomic || (event.key !== "Enter" && event.key !== "Tab")) return;
    if (!draft) return; // nothing typed — no-op close, matches renderCellModeCell's own onCommitEdit convention
    const message = validate(draft.value);
    if (message) {
      event.stopPropagation();
      return;
    }
    commit(draft.value);
  }

  function handleBlur(): void {
    if (isAtomic || !draft) return;
    if (validate(draft.value)) setDraft(undefined);
    else commit(draft.value);
  }

  return (
    <div onKeyDown={handleKeyDown} onBlur={handleBlur}>
      {column.renderEditCell
        ? column.renderEditCell(currentValue, row, onChange, error, false)
        : renderDefaultEditWidget(column, rowId, currentValue, onChange, error, false)}
    </div>
  );
}
