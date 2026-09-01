import { useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { isEditable } from "../column/types";
import { renderDefaultEditWidget } from "../edit/registry";
import { isAtomicEditorType } from "./renderCellModeCell";
import type { CellEditingCellContext } from "./useCellEditingState";

/**
 * One in-progress, uncommitted edit this component started itself.
 * `baseline` is `resolvedValue` at the moment the draft was last updated —
 * the same freshness convention `useCellEditingState`'s own `CellOverride`
 * uses, applied locally: as long as `resolvedValue` still equals `baseline`,
 * nothing else has touched this cell since, so `value` is still the right
 * thing to show/commit. The instant `resolvedValue` diverges from
 * `baseline` (a fill-drag or paste landed on this exact cell while a draft
 * was in progress), the draft is stale and must lose to that newer value —
 * committing it anyway would silently revert whatever just landed.
 */
interface LocalDraft {
  value: unknown;
  baseline: unknown;
}

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
  // Called unconditionally, before the `isEditable` early return below —
  // `column.editable` can be a per-row predicate (see `isEditable` in
  // `column/types.ts`), so whether this cell renders an editor at all can
  // differ between renders of the very same component instance; a hook
  // can't sit after a conditional return that's conditional on that.
  const [draft, setDraft] = useState<LocalDraft | undefined>(undefined);

  if (!isEditable(column, row)) {
    return (
      <span data-testid={`cell-${rowId}-${column.id}`} className="block w-full">
        {column.cell ? column.cell(resolvedValue, row) : defaultFormat(column, resolvedValue)}
      </span>
    );
  }

  const isAtomic = isAtomicEditorType(column.type);
  const error = ctx.getError(rowId, column.id);
  // Fresh only while `resolvedValue` still matches what it was when `draft`
  // was last updated — see `LocalDraft`'s own doc. A stale draft is treated
  // as if there were none: `currentValue` falls through to `resolvedValue`,
  // and the commit paths below refuse to commit it. Left in state rather
  // than cleared outright — recomputing this each render is enough to keep
  // display/commit correct without an extra render just to null it out.
  const draftIsFresh = draft !== undefined && resolvedValue === draft.baseline;
  const currentValue = draftIsFresh ? draft!.value : resolvedValue;

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
    setDraft({ value: next, baseline: resolvedValue });
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
    if (!draftIsFresh) return; // nothing (still) pending — no-op close, matches renderCellModeCell's own onCommitEdit convention
    const message = validate(draft!.value);
    if (message) {
      event.stopPropagation();
      return;
    }
    commit(draft!.value);
  }

  function handleBlur(): void {
    if (isAtomic || !draftIsFresh) return;
    if (validate(draft!.value)) setDraft(undefined);
    else commit(draft!.value);
  }

  return (
    <fieldset disabled={ctx.disabled} onKeyDown={handleKeyDown} onBlur={handleBlur} className="contents">
      {column.renderEditCell
        ? column.renderEditCell(currentValue, row, onChange, error, false)
        : renderDefaultEditWidget(column, rowId, currentValue, onChange, error, false)}
    </fieldset>
  );
}
