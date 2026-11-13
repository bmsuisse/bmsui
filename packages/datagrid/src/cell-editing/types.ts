import type { SkippedCell } from "./adaptValue";
import type { CellEditingLabels } from "./FillOptionsMenu";

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
  /**
   * Renders every editable cell's editor directly, all the time — no click,
   * double-click, F2, or typed character needed to open one first. Selection
   * (drag/shift+click/shift+arrow), copy, paste, and the fill-handle all
   * still work exactly as they do without this flag; only the single-cell
   * "one cell editing at a time" gate is gone, since with this on every
   * editable cell already IS its own editor. A buffered (string/number/
   * currency) editor still only commits on blur/Enter/Tab, same as always —
   * this flag just means it's already open, not that it types straight
   * through to `onCellsChange` on every keystroke. Defaults to false.
   */
  alwaysEdit?: boolean;
  /** Overrides the strings of the fill-drag's "Auto fill options" button and menu (e.g. to translate them). */
  labels?: Partial<CellEditingLabels>;
  /** The fill handle (drag a selection's corner to fill adjacent cells). */
  fill?: {
    /** Shows the fill handle. Defaults to true. */
    enabled?: boolean;
    /** Offers "Fill series" next to "Copy cells" after a fill, for numeric sources. Defaults to true. */
    series?: boolean;
  };
  /**
   * How paste and fill treat a target cell that can't take the value — a
   * different column type, an enum option that doesn't exist, a value its
   * `validateEdit` rejects. Such cells are always left untouched; this only
   * configures the checking and the reporting.
   */
  bulk?: {
    /** Run each target column's `validateEdit` before writing a pasted/filled value. Defaults to true. */
    validate?: boolean;
    /** Called once per paste/fill with every cell that was left untouched and why — e.g. to show a toast "3 cells skipped". */
    onSkipped?: (skipped: SkippedCell<TRow>[]) => void;
  };
}
