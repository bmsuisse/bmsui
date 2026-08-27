import { useEffect, useRef, useState } from "react";
import type { ColumnDef } from "../column/types";
import { getColumnValue } from "../column/types";
import type { EditedRow, EditingOptions } from "./types";

/** One row's accumulated pending edits. */
export interface PendingRowEdit<TRow> {
  /** The row as it looked when its first still-pending edit was made this session. */
  row: TRow;
  values: Map<string, unknown>;
}

/**
 * Everything a cell-rendering path (`renderEditableCell`) needs to decide
 * whether/how to render a given cell as an editor. Bundled into one object
 * so `<DataGrid>` can hand it through a `useRef` (see that component's own
 * doc on why — TanStack's `flexRender` treats `columnDef.cell` as a
 * component type, so a closure that changes identity on every edit would
 * remount the whole table body) while `<TreeDataGrid>`, which has no such
 * memoized column-def layer, can just read the hook's plain `ctx` value
 * directly every render.
 */
export interface EditingCellContext<TRow> {
  pendingEdits: Map<string, PendingRowEdit<TRow>>;
  editErrors: Map<string, Map<string, string>>;
  /**
   * The one row currently showing editors, or `null`. Deliberately NOT the
   * same thing as "has a pending edit": a row can be active with nothing
   * changed yet (just clicked into). At most one at a time — activating a
   * row deactivates whatever was active before it (edit row by row, not
   * several open at once). This does NOT discard the row you switch away
   * from: its own pending edits stay exactly as they were in `pendingEdits`,
   * just no longer shown as editors.
   */
  activeRowId: string | null;
  /** Set only by the click that activated a row — see `EditWidgetProps.autoFocus`'s own doc for why this exists. */
  autoFocusTarget: { rowId: string; columnId: string } | null;
  getRowId: (row: TRow) => string;
  onEdit: (column: ColumnDef<TRow>, row: TRow, value: unknown) => void;
  /** Activates `rowId` (deactivating whatever row was active before it) and requests autofocus on `columnId`'s editor specifically — the column whose static cell was actually clicked. */
  onActivateRow: (rowId: string, columnId: string) => void;
}

export interface EditingState<TRow> {
  pendingEdits: Map<string, PendingRowEdit<TRow>>;
  editErrors: Map<string, Map<string, string>>;
  hasEditErrors: boolean;
  /** The live editing context — read directly during a render body that has no remount-avoidance concerns of its own (e.g. `<TreeDataGrid>`'s plain per-row render). */
  ctx: EditingCellContext<TRow> | undefined;
  /** Same context, mirrored into a ref every render — for a caller (`<DataGrid>`) whose cell-rendering closures must stay referentially stable and so can't close over `ctx` directly. */
  ctxRef: { current: EditingCellContext<TRow> | undefined };
  handleSaveEdits: () => Promise<void>;
  handleDiscardEdits: () => void;
}

/**
 * Same convention `defaultFormat`'s docs point to for other primitive
 * comparisons, extended to `Date`: the default `DateEditor` emits real `Date`
 * objects, and two distinct `Date` instances for the same instant are never
 * `===` to each other — without this, editing a date cell back to its
 * original value (a real thing to do while fixing a typo) would never clear
 * its own pending-edit entry, since the equality check below would always
 * see "changed."
 */
export function editValuesEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

/**
 * Owns the full accumulate-then-save inline-editing state machine: pending
 * edits, validation errors, which row is active, autofocus targeting, and
 * the Save/Discard commit logic — shared by `<DataGrid>` and
 * `<TreeDataGrid>` so the tricky parts (the async-save race around edits
 * made while `onSave` is in flight, the one-shot autoFocus consumption) only
 * exist, and only need fixing, in one place.
 */
export function useEditingState<TRow>(
  editing: EditingOptions<TRow> | undefined,
  getRowId: (row: TRow) => string,
): EditingState<TRow> {
  // Uncontrolled-only — there's no scenario where a caller wants to seed or
  // drive pending edits from outside, only to read them back out via
  // `editing.onSave` once the user commits. Keyed by row id, not by (row
  // id, column id) pair: storing the row snapshot once per row (not once
  // per edited cell) is what lets `handleSaveEdits` hand back a real `TRow`
  // per edited row without a second id-keyed lookup across whatever page/
  // filter/expansion state the grid is in by the time Save is clicked.
  const [pendingEdits, setPendingEdits] = useState<Map<string, PendingRowEdit<TRow>>>(new Map());
  const [editErrors, setEditErrors] = useState<Map<string, Map<string, string>>>(new Map());
  const hasEditErrors = editErrors.size > 0;

  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [autoFocusTarget, setAutoFocusTarget] = useState<{ rowId: string; columnId: string } | null>(null);

  function activateRow(rowId: string, columnId: string): void {
    setActiveRowId(rowId);
    setAutoFocusTarget({ rowId, columnId });
  }

  // Consumes `autoFocusTarget` exactly once, right after the render that
  // used it — NOT redundant with native `autoFocus` only firing on a DOM
  // node's *initial* mount. Under `virtualize`, a row's DOM can unmount
  // (scrolled out of the windowed range) and later remount (scrolled back
  // in); without clearing `autoFocusTarget` after its first use, that later
  // remount is ALSO an "initial mount" as far as the DOM is concerned,
  // silently stealing focus back to a cell the user scrolled away from.
  useEffect(() => {
    if (autoFocusTarget) setAutoFocusTarget(null);
  }, [autoFocusTarget]);

  function commitEdit(column: ColumnDef<TRow>, row: TRow, value: unknown): void {
    const rowId = getRowId(row);
    const baseline = getColumnValue(column, row);
    setPendingEdits((prev) => {
      const next = new Map(prev);
      const values = new Map(next.get(rowId)?.values);
      if (editValuesEqual(value, baseline)) values.delete(column.id);
      else values.set(column.id, value);
      if (values.size === 0) next.delete(rowId);
      else next.set(rowId, { row, values });
      return next;
    });
    const message = column.validateEdit?.(value, row);
    setEditErrors((prev) => {
      const next = new Map(prev);
      const rowErrors = new Map(next.get(rowId));
      if (message) rowErrors.set(column.id, message);
      else rowErrors.delete(column.id);
      if (rowErrors.size === 0) next.delete(rowId);
      else next.set(rowId, rowErrors);
      return next;
    });
  }

  async function handleSaveEdits(): Promise<void> {
    if (!editing || pendingEdits.size === 0) return;
    const snapshot = pendingEdits;
    const edited: EditedRow<TRow>[] = [...snapshot.entries()].map(([rowId, entry]) => ({
      rowId,
      row: entry.row,
      values: Object.fromEntries(entry.values),
    }));
    try {
      await editing.onSave(edited);
    } catch {
      // `onSave`'s own doc: rejecting means "keep every pending edit exactly
      // as it was" — the caller is responsible for its own error UI; this
      // catch exists only so that rejection doesn't also surface as an
      // unhandled promise rejection on top of whatever the caller already
      // shows.
      return;
    }
    // Clear only what THIS save actually covered, and only where it hasn't
    // changed since — nothing here disables a cell's inputs while `onSave`
    // is in flight (that's the caller's own `editing.saving` to act on;
    // this hook doesn't force it), so the user can keep typing into the
    // active row, or even switch to and edit a different one, during the
    // await. A blanket "clear everything" here would silently discard
    // whatever they typed in that window, even though it was never part of
    // `edited` at all. `survivedRowIds`/`clearedErrorKeys` are plain
    // synchronous side-channels from the `setPendingEdits` updater below to
    // the two updaters after it — safe because React runs queued updater
    // functions in order, synchronously, before committing.
    const snapshotRowIds = new Set(snapshot.keys());
    const survivedRowIds = new Set<string>();
    const clearedErrorKeys: { rowId: string; columnId: string }[] = [];
    setPendingEdits((prev) => {
      const next = new Map(prev);
      for (const [rowId, snapshotEntry] of snapshot) {
        const current = next.get(rowId);
        if (!current) continue;
        const values = new Map(current.values);
        for (const [columnId, snapshotValue] of snapshotEntry.values) {
          if (values.has(columnId) && editValuesEqual(values.get(columnId), snapshotValue)) {
            values.delete(columnId);
            clearedErrorKeys.push({ rowId, columnId });
          }
        }
        if (values.size === 0) {
          next.delete(rowId);
        } else {
          next.set(rowId, { row: current.row, values });
          survivedRowIds.add(rowId);
        }
      }
      return next;
    });
    setEditErrors((prev) => {
      if (clearedErrorKeys.length === 0) return prev;
      const next = new Map(prev);
      for (const { rowId, columnId } of clearedErrorKeys) {
        const rowErrors = next.get(rowId);
        if (!rowErrors) continue;
        const nextRowErrors = new Map(rowErrors);
        nextRowErrors.delete(columnId);
        if (nextRowErrors.size === 0) next.delete(rowId);
        else next.set(rowId, nextRowErrors);
      }
      return next;
    });
    // Deactivates the active row only if it was part of this save AND has
    // nothing left pending on it afterward — a row clicked into but never
    // actually changed (never part of `edited`) has nothing to save but
    // also nothing wrong with it, and one that got a NEW edit during the
    // await still has work in progress, so neither should be kicked out.
    setActiveRowId((prev) =>
      prev !== null && snapshotRowIds.has(prev) && !survivedRowIds.has(prev) ? null : prev,
    );
  }

  function handleDiscardEdits(): void {
    setPendingEdits(new Map());
    setEditErrors(new Map());
    setActiveRowId(null);
    editing?.onDiscard?.();
  }

  const ctx: EditingCellContext<TRow> | undefined = editing
    ? { pendingEdits, editErrors, activeRowId, autoFocusTarget, getRowId, onEdit: commitEdit, onActivateRow: activateRow }
    : undefined;

  // Reassigned every render (a plain statement, not an effect) so it's
  // already current by the time a `<DataGrid>`-style memoized cell closure
  // actually renders a cell in this same pass.
  const ctxRef = useRef<EditingCellContext<TRow> | undefined>(undefined);
  ctxRef.current = ctx;

  return { pendingEdits, editErrors, hasEditErrors, ctx, ctxRef, handleSaveEdits, handleDiscardEdits };
}
