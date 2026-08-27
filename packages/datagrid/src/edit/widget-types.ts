/**
 * Contract every built-in edit widget implements — the `renderEditCell`
 * equivalent of `filter/widget-types.ts`'s `FilterWidgetProps`. `TColumn` is
 * narrowed to the specific column shape the widget knows how to render (e.g.
 * `EnumColumn` for `EnumEditor`) — `renderDefaultEditWidget` picks the right
 * widget by `column.type` before handing it a column, so the widget itself
 * never has to branch on `type`.
 *
 * `value` is the cell's current value: the row's original value, or a
 * still-pending edit if the user already changed it this session.
 * `onChange` records a new pending value — it does not itself validate or
 * persist anything. `error`, when set, is this cell's current
 * `column.validateEdit` message; every built-in widget shows it as small
 * text under its control and marks the control `aria-invalid`.
 *
 * `rowId` exists purely so each built-in widget's own `data-testid` (`edit-
 * ${rowId}-${column.id}`) stays unique per cell — unlike a filter widget,
 * which renders exactly once per column (in the header), an edit widget
 * renders once per (row, column) pair, so a column-id-only testid would
 * collide across every row the moment a grid has more than one.
 *
 * `autoFocus` is true for exactly one cell per row-activation: the specific
 * column whose static cell the user clicked (or Enter/Space'd) to turn the
 * whole row into editors — every other cell in that same row gets `false`.
 * Every built-in widget forwards it straight to its underlying control's own
 * native `autoFocus` prop, so the browser focuses that one control the
 * moment it mounts, without an extra click to actually start typing.
 */
export interface EditWidgetProps<TColumn> {
  column: TColumn;
  rowId: string;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string;
  autoFocus?: boolean;
}
