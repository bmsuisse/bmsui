import { useRef, useState } from "react";
import type { CellAddress, CellChange, CellEditingOptions } from "./types";

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`;
}

/**
 * One cell's locally-echoed value after a commit, kept only until the row's
 * own real data (`rawValue` at render time) stops matching `previousValue` —
 * see `resolveValue`'s own doc for why that's the right invalidation
 * condition for a fire-and-forget, no-rollback model.
 */
interface CellOverride {
  value: unknown;
  previousValue: unknown;
}

/**
 * Everything `renderCellModeCell` needs to render one cell under
 * `cellEditing` mode. Bundled into one object handed through a `useRef` for
 * the identical reason `EditingCellContext` is (see that type's own doc):
 * `<DataGrid>`'s `tanstackColumns` memo must not depend on anything that
 * changes per-keystroke, or typing into one cell would remount the whole
 * table body.
 */
export interface CellEditingCellContext<TRow> {
  /** Mirrors `CellEditingOptions.alwaysEdit` — every editable cell renders `AlwaysEditCell` instead of going through `editingCell`/`onBeginEdit` at all when this is set. */
  alwaysEdit: boolean;
  /** The one cell currently showing its editor, or `undefined` — at most one at a time, the same convention `EditingCellContext.activeRowId` uses at row granularity. Meaningless (always `undefined`) under `alwaysEdit`, where every editable cell already has its own editor. */
  editingCell: CellAddress | undefined;
  /** Replaces (doesn't append to) the editor's starting value when editing began by typing a printable character directly (Excel's "just start typing" gesture) rather than double-click/Enter/F2, which start from the cell's current value. `undefined` means "start from the current value." */
  initialText: string | undefined;
  /** Whether at least one `onChangeDraft` has fired this edit session — distinguishes "no keystrokes yet, show the starting value" from "the user explicitly typed something," including an empty string. */
  hasDraft: boolean;
  /** The in-progress typed value for `editingCell`, meaningful only when `hasDraft` is true. */
  draftValue: unknown;
  getRowId: (row: TRow) => string;
  getError: (rowId: string, columnId: string) => string | undefined;
  /**
   * The value to actually display for one cell: `rawValue` (the row's real
   * data) unless a still-"fresh" local override exists. An override is
   * fresh only while `rawValue` still equals what it was at the moment of
   * the edit (`previousValue`) — the instant the row's real data changes to
   * ANYTHING else (the consumer's `onCellsChange` handler updated its own
   * `data` to reflect the accepted edit, or a refetch landed with something
   * different entirely, e.g. server-side normalization), real data is
   * trusted again instead of the stale local echo. This is what lets a
   * fire-and-forget, no-rollback model (see `CellEditingOptions.onCellsChange`'s
   * own doc) still self-correct if the consumer's eventual real data
   * diverges from what was optimistically shown.
   */
  resolveValue: (rowId: string, columnId: string, rawValue: unknown) => unknown;
  /** Starts editing `cell`. */
  onBeginEdit: (cell: CellAddress, initialText?: string) => void;
  /** Reverts without committing — Escape, or a blur while the current draft is invalid. */
  onCancelEdit: () => void;
  /** Records a keystroke/selection's new value for the cell currently being edited — for an "atomic" editor (enum/boolean/date, where a single selection IS the complete gesture) the caller follows this immediately with `onCommitEdit`; for a free-text editor (string/number) this only buffers, and the caller commits separately on blur/Enter/Tab. */
  onChangeDraft: (value: unknown) => void;
  /** Commits the current draft (or, if `hasDraft` is false, effectively a no-op close) for the cell currently being edited, as one `CellChange`, and closes its editor. `previousValue` is the row's real value before this edit, for the resulting `CellChange.previousValue`. */
  onCommitEdit: (row: TRow, previousValue: unknown) => void;
  /**
   * Commits an explicit `value` directly, bypassing the draft state
   * entirely — for an "atomic" editor (enum/boolean/date) whose `onChange`
   * fires once with the complete new value and wants to commit in that same
   * call. `onCommitEdit` above can't be reused for this: it reads `hasDraft`/
   * `draftValue` from React state, which a same-tick `onChangeDraft` call
   * immediately before it would NOT yet reflect (state updates don't apply
   * until the next render, even within the same event handler).
   */
  onCommitValue: (row: TRow, previousValue: unknown, value: unknown) => void;
  onSetError: (rowId: string, columnId: string, message: string | undefined) => void;
  /** Commits one independently-managed cell's change directly — for `AlwaysEditCell`, which owns its own draft state locally rather than through `editingCell`/`onChangeDraft`/`onCommitEdit`'s single shared slot (every editable cell needs its own simultaneous editor under `alwaysEdit`, not just one at a time). */
  applyChange: (change: CellChange<TRow>) => void;
  /**
   * Reads (and clears) whether `onCommitEdit`/`onCommitValue` committed
   * synchronously during the current call stack. `<DataGrid>`'s own keydown
   * handler needs this: `renderCellModeCell`'s Enter/Tab commit deliberately
   * doesn't stop the event from bubbling, so that handler can advance the
   * selection afterward — but `editingCell` itself is React state, which
   * doesn't reflect `closeEditor()`'s update until the next render, so
   * reading it directly during that same bubbled dispatch always still
   * shows the row that JUST closed. This ref-backed flag is the one piece of
   * "did a commit just happen in this exact gesture" state that's readable
   * synchronously, in the same event, immediately after the commit.
   */
  consumeJustCommitted: () => boolean;
}

export interface CellEditingState<TRow> {
  /** The live context, read directly by a render path with no remount-avoidance concerns of its own. */
  ctx: CellEditingCellContext<TRow> | undefined;
  /** Same context, mirrored into a ref every render — see `CellEditingCellContext`'s own doc for why `<DataGrid>`'s per-cell closures must read through this instead of closing over `ctx` directly. */
  ctxRef: { current: CellEditingCellContext<TRow> | undefined };
  /** Commits a whole gesture's changes at once (paste, fill-drag) — no `editingCell` involved, unlike `onCommitEdit` above. */
  applyChanges: (changes: CellChange<TRow>[]) => void;
}

/**
 * Owns the "true spreadsheet" per-cell edit state: which single cell (if
 * any) is showing its editor, that cell's in-progress typed draft, per-cell
 * validation errors, and the local-override echo every committed change
 * leaves behind until the consumer's own real data catches up. Every
 * mutation — a typed commit, a future paste, a future fill-drag — funnels
 * through `applyChanges`, so a later undo/redo can be built on top of that
 * one function without a rearchitecture.
 */
export function useCellEditingState<TRow>(
  cellEditing: CellEditingOptions<TRow> | undefined,
  getRowId: (row: TRow) => string,
): CellEditingState<TRow> {
  const [editingCell, setEditingCell] = useState<CellAddress | undefined>(undefined);
  const [initialText, setInitialText] = useState<string | undefined>(undefined);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftValue, setDraftValue] = useState<unknown>(undefined);
  const [overrides, setOverrides] = useState<Map<string, CellOverride>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const justCommittedRef = useRef(false);

  function closeEditor(): void {
    setEditingCell(undefined);
    setInitialText(undefined);
    setHasDraft(false);
    setDraftValue(undefined);
  }

  function applyChanges(changes: CellChange<TRow>[]): void {
    if (!cellEditing || cellEditing.disabled || changes.length === 0) return;
    setOverrides((prev) => {
      const next = new Map(prev);
      for (const change of changes) {
        next.set(cellKey(change.rowId, change.columnId), { value: change.value, previousValue: change.previousValue });
      }
      return next;
    });
    setErrors((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      for (const change of changes) next.delete(cellKey(change.rowId, change.columnId));
      return next.size === prev.size ? prev : next;
    });
    void cellEditing.onCellsChange(changes);
  }

  function onBeginEdit(cell: CellAddress, text?: string): void {
    // Matches `applyChanges`'s own `disabled` gate — a consumer setting
    // `cellEditing.disabled` (e.g. while a previous gesture's `onCellsChange`
    // is still in flight) expects ALL interaction blocked, not just the
    // eventual commit silently discarded while the editor still visibly
    // opens and appears to accept input.
    if (!cellEditing || cellEditing.disabled) return;
    setEditingCell(cell);
    setInitialText(text);
    setHasDraft(text !== undefined);
    setDraftValue(text);
  }

  function onChangeDraft(value: unknown): void {
    setHasDraft(true);
    setDraftValue(value);
  }

  function onCommitEdit(row: TRow, previousValue: unknown): void {
    const cell = editingCell;
    const shouldCommit = hasDraft;
    const value = draftValue;
    closeEditor();
    if (!cell || !shouldCommit) return;
    justCommittedRef.current = true;
    applyChanges([{ rowId: cell.rowId, row, columnId: cell.columnId, previousValue, value }]);
  }

  function onCommitValue(row: TRow, previousValue: unknown, value: unknown): void {
    const cell = editingCell;
    closeEditor();
    if (!cell) return;
    justCommittedRef.current = true;
    applyChanges([{ rowId: cell.rowId, row, columnId: cell.columnId, previousValue, value }]);
  }

  function consumeJustCommitted(): boolean {
    const value = justCommittedRef.current;
    justCommittedRef.current = false;
    return value;
  }

  function onSetError(rowId: string, columnId: string, message: string | undefined): void {
    setErrors((prev) => {
      const key = cellKey(rowId, columnId);
      if (message === undefined) {
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.delete(key);
        return next;
      }
      const next = new Map(prev);
      next.set(key, message);
      return next;
    });
  }

  function getError(rowId: string, columnId: string): string | undefined {
    return errors.get(cellKey(rowId, columnId));
  }

  function resolveValue(rowId: string, columnId: string, rawValue: unknown): unknown {
    const override = overrides.get(cellKey(rowId, columnId));
    if (!override) return rawValue;
    if (rawValue !== override.previousValue) return rawValue;
    return override.value;
  }

  const ctx: CellEditingCellContext<TRow> | undefined = cellEditing
    ? {
        alwaysEdit: cellEditing.alwaysEdit ?? false,
        editingCell,
        initialText,
        hasDraft,
        draftValue,
        getRowId,
        getError,
        resolveValue,
        onBeginEdit,
        onCancelEdit: closeEditor,
        onChangeDraft,
        onCommitEdit,
        onCommitValue,
        onSetError,
        applyChange: (change) => applyChanges([change]),
        consumeJustCommitted,
      }
    : undefined;

  // Reassigned every render (a plain statement, not an effect) — see
  // `CellEditingCellContext`'s own doc for why.
  const ctxRef = useRef<CellEditingCellContext<TRow> | undefined>(undefined);
  ctxRef.current = ctx;

  return { ctx, ctxRef, applyChanges };
}
