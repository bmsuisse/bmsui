import type { ReactElement } from "react";
import type { BooleanColumn } from "../column/types";
import { Checkbox } from "../components/ui/checkbox";
import type { EditWidgetProps } from "./widget-types";

/**
 * Same explicit-comparison convention as `defaultFormat`'s boolean case
 * (not a truthy check) — a truthy check would treat the *string* `"false"`
 * as checked, a real shape for boolean data round-tripped through JSON/CSV.
 */
function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  if (typeof value === "number") return value !== 0;
  return false;
}

/** Default inline editor for `type: "boolean"` columns: a single checkbox. */
export function BooleanEditor<TRow>({
  column,
  rowId,
  value,
  onChange,
  error,
  autoFocus,
}: EditWidgetProps<BooleanColumn<TRow>>): ReactElement {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Checkbox
        aria-label={`Edit ${column.header}`}
        aria-invalid={error ? true : undefined}
        data-testid={`edit-${rowId}-${column.id}`}
        autoFocus={autoFocus}
        checked={toBoolean(value)}
        onCheckedChange={(next) => onChange(next === true)}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
