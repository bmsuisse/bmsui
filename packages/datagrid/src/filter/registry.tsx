import type { ReactElement } from "react";
import type { ColumnDef } from "../column/types";
import { BooleanFilter } from "./BooleanFilter";
import { DateRangeFilter } from "./DateRangeFilter";
import { EnumFilter } from "./EnumFilter";
import { NumberRangeFilter } from "./NumberRangeFilter";
import { StringFilter } from "./StringFilter";
import type { FilterDescriptor } from "./types";

/**
 * Picks and renders the default filter widget for a column, based purely on
 * `column.type`. This is what makes filtering "just work" without a column
 * having to configure anything — the discriminated union on `type` lets each
 * branch narrow `column` to the exact widget it needs.
 *
 * Every default widget has its own self-contained Popover+trigger Button
 * (needed under `filterDisplay: "row"`, where nothing else provides one) —
 * everywhere else, `<DataGrid>`'s own header filter icon already opens a
 * popover around whatever this function returns, so passing `bare: true`
 * there (this function is `<DataGrid>`'s only caller, and always knows
 * `column.filterDisplay` already) is what keeps that from nesting a second
 * popover inside the first.
 */
export function renderDefaultFilterWidget<TRow>(
  column: ColumnDef<TRow>,
  value: FilterDescriptor | undefined,
  onChange: (next: FilterDescriptor | undefined) => void,
): ReactElement {
  const bare = column.filterDisplay !== "row";
  switch (column.type) {
    case "string":
      return <StringFilter column={column} value={value} onChange={onChange} bare={bare} />;
    case "enum":
      return <EnumFilter column={column} value={value} onChange={onChange} bare={bare} />;
    case "boolean":
      return <BooleanFilter column={column} value={value} onChange={onChange} bare={bare} />;
    case "number":
    case "currency":
      return <NumberRangeFilter column={column} value={value} onChange={onChange} bare={bare} />;
    case "date":
    case "datetime":
      return <DateRangeFilter column={column} value={value} onChange={onChange} bare={bare} />;
  }
}
