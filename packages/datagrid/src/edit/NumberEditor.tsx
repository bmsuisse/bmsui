import type { ReactElement } from "react";
import type { NumberColumn } from "../column/types";
import { Input } from "../components/ui/input";
import { editErrorId, type EditWidgetProps } from "./widget-types";

/**
 * Default inline editor for `type: "number"` / `type: "currency"` columns: a
 * native number input. Emits `null` for an emptied field (not `NaN` or `""`)
 * so `validateEdit`/`onSave` see an explicit "cleared" value; otherwise emits
 * a real `number`, never the input's raw string.
 */
export function NumberEditor<TRow>({
  column,
  rowId,
  value,
  onChange,
  error,
  autoFocus,
}: EditWidgetProps<NumberColumn<TRow>>): ReactElement {
  const errorId = editErrorId(rowId, column.id);
  return (
    <div>
      <Input
        type="number"
        className="h-8"
        aria-label={`Edit ${column.header}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-testid={`edit-${rowId}-${column.id}`}
        autoFocus={autoFocus}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      />
      {error && (
        <span id={errorId} className="mt-0.5 block text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
