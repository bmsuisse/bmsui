import type { ReactElement } from "react";
import type { StringColumn } from "../column/types";
import { Input } from "../components/ui/input";
import type { EditWidgetProps } from "./widget-types";

/** Default inline editor for `type: "string"` columns: a plain text input. */
export function StringEditor<TRow>({
  column,
  rowId,
  value,
  onChange,
  error,
}: EditWidgetProps<StringColumn<TRow>>): ReactElement {
  return (
    <div>
      <Input
        className="h-8"
        aria-label={`Edit ${column.header}`}
        aria-invalid={error ? true : undefined}
        data-testid={`edit-${rowId}-${column.id}`}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="mt-0.5 block text-xs text-destructive">{error}</span>}
    </div>
  );
}
