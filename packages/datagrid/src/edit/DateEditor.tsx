import { format as formatDate, parseISO } from "date-fns";
import type { ReactElement } from "react";
import type { DateColumn } from "../column/types";
import { toDate } from "../column/format";
import { Input } from "../components/ui/input";
import { EditFieldError } from "./EditFieldError";
import { editErrorId, type EditWidgetProps } from "./widget-types";

/**
 * Formats a raw cell value into the string a native date/datetime-local
 * input expects, or `""` if it isn't a valid date. Includes seconds for
 * `"datetime"` (paired with the input's own `step={1}` below, so the
 * browser's picker UI shows a seconds field too) — omitting them here would
 * silently truncate any datetime value's seconds the moment a user edits
 * that cell at all, even if all they touched was the date portion, since
 * the input's own value string is what `onChange` below reconstructs a
 * `Date` from. Milliseconds are still dropped — native `datetime-local`
 * inputs support them via 3-decimal seconds, but sub-second precision on a
 * grid-edited datetime column is enough of an edge case to leave as a
 * documented scope cut rather than add here.
 */
function inputValueOf(value: unknown, columnType: "date" | "datetime"): string {
  const date = toDate(value);
  if (!date) return "";
  return columnType === "datetime" ? formatDate(date, "yyyy-MM-dd'T'HH:mm:ss") : formatDate(date, "yyyy-MM-dd");
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
  const errorId = editErrorId(rowId, column.id);
  return (
    <div>
      <Input
        type={column.type === "datetime" ? "datetime-local" : "date"}
        step={column.type === "datetime" ? 1 : undefined}
        className="h-8"
        aria-label={`Edit ${column.header}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-testid={`edit-${rowId}-${column.id}`}
        autoFocus={autoFocus}
        value={inputValueOf(value, column.type)}
        onChange={(event) => onChange(event.target.value === "" ? null : parseISO(event.target.value))}
      />
      {error && <EditFieldError id={errorId} message={error} />}
    </div>
  );
}
