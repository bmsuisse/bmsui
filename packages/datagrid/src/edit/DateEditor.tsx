import { format as formatDate, parseISO } from "date-fns";
import type { ReactElement } from "react";
import type { DateColumn } from "../column/types";
import { toDate } from "../column/format";
import { Input } from "../components/ui/input";
import type { EditWidgetProps } from "./widget-types";

/** Formats a raw cell value into the string a native date/datetime-local input expects, or `""` if it isn't a valid date. */
function inputValueOf(value: unknown, columnType: "date" | "datetime"): string {
  const date = toDate(value);
  if (!date) return "";
  return columnType === "datetime" ? formatDate(date, "yyyy-MM-dd'T'HH:mm") : formatDate(date, "yyyy-MM-dd");
}

/**
 * Default inline editor for `type: "date"` / `type: "datetime"` columns: a
 * native `<input type="date">`/`<input type="datetime-local">`. Emits a
 * `Date` (or `null` for an emptied field), via `parseISO` rather than the
 * bare `new Date(...)` constructor — same convention `DateRangeFilter`'s
 * `parseBound` and `format.ts`'s `toDate` already use, since a native date
 * input's value is a date-only `"YYYY-MM-DD"` string for `type: "date"`,
 * which the JS spec would otherwise parse as UTC midnight instead of local
 * midnight.
 */
export function DateEditor<TRow>({
  column,
  rowId,
  value,
  onChange,
  error,
  autoFocus,
}: EditWidgetProps<DateColumn<TRow>>): ReactElement {
  return (
    <div>
      <Input
        type={column.type === "datetime" ? "datetime-local" : "date"}
        className="h-8"
        aria-label={`Edit ${column.header}`}
        aria-invalid={error ? true : undefined}
        data-testid={`edit-${rowId}-${column.id}`}
        autoFocus={autoFocus}
        value={inputValueOf(value, column.type)}
        onChange={(event) => onChange(event.target.value === "" ? null : parseISO(event.target.value))}
      />
      {error && <span className="mt-0.5 block text-xs text-destructive">{error}</span>}
    </div>
  );
}
