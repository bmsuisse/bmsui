/**
 * Identifies one cell by stable row id + column id — never by DOM node or
 * virtualization index, so a selection/edit survives a virtualized row
 * mounting, unmounting, and remounting as the grid scrolls.
 */
export interface CellAddress {
  rowId: string;
  columnId: string;
}

/**
 * A rectangular block of cells, expressed as its two corners: `anchor` is
 * the cell where the selection/drag started, `focus` is the other corner —
 * the one that moves as you shift+arrow or drag the mouse. Either corner can
 * be the top-left or bottom-right one; use `normalizeRange` (in
 * `rangeUtils.ts`) to resolve that.
 */
export interface CellRange {
  anchor: CellAddress;
  focus: CellAddress;
}

/**
 * One committed cell edit — from a typed commit, a paste, or a fill-drag.
 * `previousValue` isn't read by anything in this pass; it's carried now so a
 * future undo/redo can be built on top of the same `CellChange` log without
 * a breaking API change later.
 */
export interface CellChange<TRow> {
  rowId: string;
  row: TRow;
  columnId: string;
  previousValue: unknown;
  value: unknown;
}

/**
 * Enables the "true spreadsheet" cell-editing mode on `<DataGrid>`: click or
 * type directly into any cell, range-select, paste, fill-handle — every
 * change applies immediately, with no row-level Save/Discard gate. This is a
 * different state machine from `DataGridProps.editing`'s accumulate-then-save
 * workflow, not a superset of it — set at most one of `editing`/`cellEditing`
 * on a given `<DataGrid>`; `editing` is ignored once `cellEditing` is set.
 */
export interface CellEditingOptions<TRow> {
  /**
   * Called once per gesture — one typed-cell commit, one paste, one
   * fill-drag — with every cell that gesture changed. There's no debouncing:
   * each gesture's full change set is computed synchronously before this
   * fires, so a single keystroke commit is one `[change]`, and pasting a
   * 50-cell block is one call with 50 entries.
   *
   * Fire-and-forget: a rejection does not roll back the grid's own local
   * display of the new values — there's no "pending" state to roll back to
   * in an immediate-apply model, unlike `EditingOptions.onSave`. Show your
   * own error UI (e.g. a toast) if a change needs to be surfaced as failed.
   */
  onCellsChange: (changes: CellChange<TRow>[]) => void | Promise<void>;
  /** Disables all cell-editing interaction — e.g. while a previous gesture's `onCellsChange` is still in flight. Defaults to false. */
  disabled?: boolean;
}
