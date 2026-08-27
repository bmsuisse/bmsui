import type { ReactElement } from "react";
import type { ColumnDef } from "../column/types";
import { BooleanEditor } from "./BooleanEditor";
import { DateEditor } from "./DateEditor";
import { EnumEditor } from "./EnumEditor";
import { NumberEditor } from "./NumberEditor";
import { StringEditor } from "./StringEditor";

/**
 * Picks and renders the default inline-edit widget for a column, based
 * purely on `column.type` — the `renderEditCell` equivalent of
 * `filter/registry.tsx`'s `renderDefaultFilterWidget`. `<DataGrid>` calls
 * this itself for any editable column that doesn't set its own
 * `renderEditCell`; a consuming app only reaches for it directly to wrap or
 * extend one of these defaults rather than writing an editor from scratch.
 */
export function renderDefaultEditWidget<TRow>(
  column: ColumnDef<TRow>,
  rowId: string,
  value: unknown,
  onChange: (next: unknown) => void,
  error?: string,
): ReactElement {
  switch (column.type) {
    case "string":
      return <StringEditor column={column} rowId={rowId} value={value} onChange={onChange} error={error} />;
    case "enum":
      return <EnumEditor column={column} rowId={rowId} value={value} onChange={onChange} error={error} />;
    case "boolean":
      return <BooleanEditor column={column} rowId={rowId} value={value} onChange={onChange} error={error} />;
    case "number":
    case "currency":
      return <NumberEditor column={column} rowId={rowId} value={value} onChange={onChange} error={error} />;
    case "date":
    case "datetime":
      return <DateEditor column={column} rowId={rowId} value={value} onChange={onChange} error={error} />;
  }
}
