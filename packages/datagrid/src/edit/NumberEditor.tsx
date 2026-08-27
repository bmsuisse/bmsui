import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type { NumberColumn } from "../column/types";
import { Input } from "../components/ui/input";
import { EditFieldError } from "./EditFieldError";
import { editErrorId, type EditWidgetProps } from "./widget-types";

function textFromValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Default inline editor for `type: "number"` / `type: "currency"` columns: a
 * native number input. Emits `null` for an emptied field (not `NaN` or `""`)
 * so `validateEdit`/`onSave` see an explicit "cleared" value; otherwise emits
 * a real `number`, never the input's raw string.
 *
 * Keeps its own local `text` state instead of deriving the input's `value`
 * straight from the `value` prop on every render — a native
 * `type="number"` input's own `.value` getter reads back as `""` while the
 * user is mid-typing a string that isn't yet a complete valid float ("12.",
 * "-", "1e"), even though the field still visually shows what they typed.
 * Deriving the controlled `value` prop straight from a re-parsed number
 * would feed that `""` back in on every such keystroke, wiping the decimal
 * point/minus sign before the user can finish typing it. `lastEmittedRef` +
 * the effect below only resync `text` from an EXTERNAL change to `value`
 * (Escape-revert, switching rows and back, a row's data refetched) — the
 * same pattern `NumberComparisonFilter` already uses for the identical
 * reason; see that component's own doc.
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
  const [text, setText] = useState(() => textFromValue(value));
  const lastEmittedRef = useRef(value);

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    setText(textFromValue(value));
  }, [value]);

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
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const next = event.target.value === "" ? null : Number(event.target.value);
          lastEmittedRef.current = next;
          onChange(next);
        }}
      />
      {error && <EditFieldError id={errorId} message={error} />}
    </div>
  );
}
