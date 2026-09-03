import type { ReactNode } from "react";
import type { CompositeFilterDescriptor, FilterDescriptor } from "../filter/types";

/** Horizontal alignment used for a column's cell content and header. */
export type ColumnAlign = "left" | "center" | "right";

/** Fields shared by every column type, independent of `type`. */
export interface BaseColumn<TRow> {
  id: string;
  accessorKey?: keyof TRow & string;
  accessorFn?: (row: TRow) => unknown;
  header: string;
  width?: number;
  /** Opt-in: defaults to false — must be explicitly set to true to show a sort toggle in the header. */
  sortable?: boolean;
  /**
   * Opt-in: defaults to false, meaning a first click sorts ascending. Set true for a
   * column whose "interesting" direction is descending — revenue, risk scores, backlog —
   * so a first click surfaces the highest/most-urgent values first instead of the
   * lowest/safest ones. Cycles desc -> asc -> none instead of the default asc -> desc -> none.
   */
  sortDescFirst?: boolean;
  /** Opt-in: defaults to false — must be explicitly set to true to show a filter icon/widget in the header. */
  filterable?: boolean;
  pinned?: "left" | "right";
  /** Overrides the default type-based renderer. */
  cell?: (value: unknown, row: TRow) => ReactNode;
  /** Free-text group label for <ColumnSelector>; columns sharing a group are shown together. Ungrouped when omitted. */
  group?: string;
  /**
   * Free-text label for a spanning header cell in `<DataGrid>`'s own thead —
   * unlike `group` above (which only affects `<ColumnSelector>`), this
   * changes the grid's rendered markup. Contiguous *visible* columns sharing
   * the same `headerGroup` string get merged under one `colSpan`'d label
   * cell in an extra row above the normal per-column header row; a column
   * with no `headerGroup` instead spans both header rows itself (via
   * `rowSpan`), so it reads as a single ungrouped column rather than leaving
   * a blank cell above it. Two columns with the same `headerGroup` that
   * AREN'T adjacent in the visible column order (e.g. a differently-grouped
   * or ungrouped column sits between them) form two separate spanning cells
   * with the same label, rather than one — grouping is purely positional,
   * matching how a caller would read the columns left-to-right.
   */
  headerGroup?: string;
  /**
   * Overrides the default type-based filter widget (see
   * `renderDefaultFilterWidget`) for this column. Receives the same
   * `(value, onChange)` pair the default widget would, plus the grid's full
   * current `GridState.filter` (every column's combined filter) as a third
   * argument — needed for a widget like `NumberHistogramFilter`, whose
   * `allValues` prop must be computed via `facetedNumberValues(data, column,
   * filter)` to respect every OTHER active filter while excluding this
   * column's own (see `facetedNumberValues`'s own doc for why). Set this to
   * close over whatever extra data (e.g. the full unfiltered `data`) the
   * custom widget needs.
   */
  renderFilter?: (
    value: FilterDescriptor | undefined,
    onChange: (next: FilterDescriptor | undefined) => void,
    filter: CompositeFilterDescriptor | null,
  ) => ReactNode;
  /**
   * Where this column's filter control renders. Defaults to `"popover"`: a
   * filter-icon button in the header that opens the widget in a popover,
   * same as every column gets automatically today. `"row"` renders the
   * widget's content directly, inline, in an additional filter row under
   * the header instead — needed for a wide control (e.g.
   * `NumberHistogramFilter`'s slider/histogram) that doesn't fit well
   * collapsed into the header's compact trigger button. The filter row
   * itself is entirely opt-in: it only renders at all if at least one
   * visible, filterable column sets `filterDisplay: "row"`.
   */
  filterDisplay?: "popover" | "row";
  /**
   * Overrides the plain-text `header` rendering *inside* the header cell's
   * sort toggle `<button>` (the sort caret still renders alongside it, and
   * still inside that same button). Use this for a header that needs a
   * tooltip, an info icon, a loading spinner tied to a separate
   * batch-hydration fetch, or any other rich content — `header` itself
   * stays a plain string (used for the filter icon's `aria-label` and by
   * `<ColumnSelector>`, neither of which can work off a ReactNode).
   *
   * Whatever this returns is nested inside a real `<button>` — don't return
   * another focusable/interactive element (a nested `<button>`, a link, a
   * tooltip trigger that itself renders as a `<button>`) or the browser will
   * split the outer button apart, breaking click-to-sort for that column.
   * If the return value is non-textual (an icon with no visible label), the
   * button's accessible name is whatever text content survives inside it —
   * add your own `aria-label` inside the returned content if there isn't
   * any, since `<DataGrid>` has no way to tell your content lacks one.
   */
  renderHeader?: (column: BaseColumn<TRow>) => ReactNode;
  /**
   * Opt-in: defaults to false — must be explicitly set (or return true) for
   * `<DataGrid>` to render this column's cells as inline editors. A function
   * makes it conditional per row (e.g. a "locked" row that can't be
   * edited). See `DataGridProps.editing` for the accumulate-then-save
   * workflow this feeds into — editable cells with no `editing` prop
   * supplied just render as static text, same as if `editable` were unset.
   *
   * A cell doesn't become an editor just because this is true, though:
   * clicking (or Enter/Space-ing) any editable cell in a row is what
   * activates editors for every editable column in THAT row at once — the
   * rest of the grid's rows stay static until clicked into themselves. At
   * most one row is active at a time: activating a row deactivates whatever
   * row was active before it (edit row by row, not several open at once) —
   * this does NOT discard the row you switch away from, its own pending
   * edits stay exactly as they were, just no longer shown as editors.
   *
   * Until a cell is activated, its content renders inside a clickable
   * `<span role="button">` (this is what makes clicking it activate the
   * row) — a column that's both `editable` and has a custom `cell`
   * returning its own focusable content (a link, a button) produces nested
   * interactive elements once wrapped this way. Prefer a non-focusable
   * element (styled to look like a link, e.g.) in `cell` for a column
   * that's also `editable`, the same caution `renderHeader` needs under
   * `sortable`.
   */
  editable?: boolean | ((row: TRow) => boolean);
  /**
   * Overrides the default type-based editor (see `renderDefaultEditWidget`)
   * for this column's cells. Receives the cell's current value (the row's
   * original value, or a still-pending edit if the user already changed it
   * this session), the row itself, an `onChange` to record a new pending
   * value, this cell's current validation error message (from
   * `validateEdit` below) if any, and whether this specific cell is the one
   * whose click just activated the row (see `editable`'s own doc) — forward
   * it to your control's native `autoFocus` so the row-activating click also
   * focuses the field the user actually clicked, not just some other cell
   * in the same row.
   */
  renderEditCell?: (
    value: unknown,
    row: TRow,
    onChange: (next: unknown) => void,
    error: string | undefined,
    autoFocus: boolean,
  ) => ReactNode;
  /**
   * Validates a pending edit before it's allowed into `editing.onSave`'s
   * payload. Returning a message string blocks the Save button (and shows
   * the message under the cell) until the value is fixed or reverted to its
   * original; returning `undefined` means valid. Runs on every change to
   * this cell, including the default editors' own `onChange`.
   */
  validateEdit?: (value: unknown, row: TRow) => string | undefined;
  /**
   * Overrides the plain-text form of this column's value used when copying a
   * `cellEditing`-mode selection to the clipboard. Defaults to the same
   * `defaultFormat` display text every other rendering path already uses —
   * only needed for a column with a custom `cell` whose displayed content
   * isn't a faithful plain-text rendering of the underlying value (e.g. a
   * badge/icon), the same situation `renderFilter`/`renderEditCell` exist to
   * override for their own concerns.
   */
  formatForClipboard?: (value: unknown, row: TRow) => string;
  /**
   * Computes this column's aggregate cell content from a set of rows — the
   * same function feeds both `DataGridProps`/`TreeDataGridProps`
   * `groupBy`'s optional per-group summary row (called once per bucket, with
   * that bucket's own rows) and `showTotals`'s grand-total row (called once,
   * with every currently-rendered row). No calculation happens by default:
   * omit this to leave the column's cell blank in both rows. There's
   * deliberately no separate "group subtotal" vs. "grand total" variant —
   * both are just "reduce this set of rows to a value for this column", so
   * one function covers both.
   *
   * `showTotals`'s grand-total row calls this with EVERY currently-rendered
   * row, which can be an empty array (e.g. a filter narrows the current page
   * to zero rows) — a bare `rows.reduce((a, b) => ...)` with no seed throws
   * on an empty array, so seed your reducer (`rows.reduce((a, b) => ..., 0)`)
   * rather than assuming at least one row. A per-group summary row never
   * has this problem: a bucket only exists because at least one row produced
   * its key.
   */
  summary?: (rows: TRow[]) => ReactNode;
}

export type StringColumn<TRow> = BaseColumn<TRow> & {
  type: "string";
  /** Opt-in: defaults to false. Selects `MultilineStringEditor` (an auto-growing `<textarea>`) instead of `StringEditor`'s single-line `<Input>` for this column's default edit widget — same variant-flag idiom as `NumberColumn.currency`, not a separate `type`. Has no effect on static (non-editing) display, which stays whatever `column.cell`/`defaultFormat` already renders. */
  multiline?: boolean;
};

export type NumberColumn<TRow> = BaseColumn<TRow> & {
  type: "number" | "currency";
  currency?: string;
};

export type DateColumn<TRow> = BaseColumn<TRow> & { type: "date" | "datetime" };

export type BooleanColumn<TRow> = BaseColumn<TRow> & { type: "boolean" };

export interface EnumOption {
  value: string;
  label: string;
}

export type EnumColumn<TRow> = BaseColumn<TRow> & {
  type: "enum";
  options: EnumOption[];
};

/** Discriminated union of every supported column shape, keyed on `type`. */
export type ColumnDef<TRow> =
  | StringColumn<TRow>
  | NumberColumn<TRow>
  | DateColumn<TRow>
  | BooleanColumn<TRow>
  | EnumColumn<TRow>;

/** Resolves a column's raw cell value from a row, via `accessorFn` or `accessorKey`. */
export function getColumnValue<TRow>(column: ColumnDef<TRow>, row: TRow): unknown {
  if (column.accessorFn) return column.accessorFn(row);
  if (column.accessorKey) return row[column.accessorKey];
  return undefined;
}

/** True only if a column explicitly opts in (`sortable: true`) — the default is false. */
export function isSortable<TRow>(column: ColumnDef<TRow>): boolean {
  return column.sortable === true;
}

/** True only if a column explicitly opts in (`filterable: true`) — the default is false. */
export function isFilterable<TRow>(column: ColumnDef<TRow>): boolean {
  return column.filterable === true;
}

/** True only if a column explicitly opts in to `editable` — for this specific row, when `editable` is a predicate. Default is false. */
export function isEditable<TRow>(column: ColumnDef<TRow>, row: TRow): boolean {
  if (!column.editable) return false;
  return typeof column.editable === "function" ? column.editable(row) : true;
}
