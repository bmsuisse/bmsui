import type { ReactElement } from "react";
import type { EnumColumn } from "../column/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import type { EditWidgetProps } from "./widget-types";

/** Default inline editor for `type: "enum"` columns: a single-value select over `column.options`. */
export function EnumEditor<TRow>({
  column,
  rowId,
  value,
  onChange,
  error,
  autoFocus,
}: EditWidgetProps<EnumColumn<TRow>>): ReactElement {
  return (
    <div>
      <Select value={value === null || value === undefined ? "" : String(value)} onValueChange={onChange}>
        <SelectTrigger
          className="h-8"
          aria-label={`Edit ${column.header}`}
          aria-invalid={error ? true : undefined}
          data-testid={`edit-${rowId}-${column.id}`}
          autoFocus={autoFocus}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {column.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <span className="mt-0.5 block text-xs text-destructive">{error}</span>}
    </div>
  );
}
