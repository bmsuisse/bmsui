import type { FilterDescriptor } from "./types";

/**
 * Contract every built-in filter widget implements. `TColumn` is narrowed to
 * the specific column shape the widget knows how to render (e.g. `EnumColumn`
 * for `EnumFilter`) — the grid picks the right widget by `column.type` before
 * handing it a column, so the widget itself never has to branch on `type`.
 *
 * `value` is the current FilterDescriptor for this column, or undefined when
 * no filter is applied. `onChange(undefined)` clears the filter entirely.
 */
export interface FilterWidgetProps<TColumn> {
  column: TColumn;
  value: FilterDescriptor | undefined;
  onChange: (next: FilterDescriptor | undefined) => void;
}
