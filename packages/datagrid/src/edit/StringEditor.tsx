import type { ReactElement } from "react";
import type { StringColumn } from "../column/types";
import { Input } from "../components/ui/input";
import { EditFieldError } from "./EditFieldError";
import { editErrorId, type EditWidgetProps } from "./widget-types";
import { useIntegratedI18n } from "../i18n/locale";

/** Default inline editor for `type: "string"` columns: a plain text input. */
export function StringEditor<TRow>({
  column,
  rowId,
  value,
  onChange,
  error,
  autoFocus,
}: EditWidgetProps<StringColumn<TRow>>): ReactElement {
  const { t } = useIntegratedI18n();
  const errorId = editErrorId(rowId, column.id);
  return (
    <div>
      <Input
        className="h-8 min-w-24 [[data-fixed-layout]_&]:min-w-0"
        aria-label={t("grid.editCell", { header: column.header })}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-testid={`edit-${rowId}-${column.id}`}
        autoFocus={autoFocus}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <EditFieldError id={errorId} message={error} />}
    </div>
  );
}
