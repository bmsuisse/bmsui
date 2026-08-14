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
}

export type StringColumn<TRow> = BaseColumn<TRow> & { type: "string" };

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
