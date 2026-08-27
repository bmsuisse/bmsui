import type { ReactElement, ReactNode } from "react";
import { Button } from "../components/ui/button";
import type { EditingOptions } from "./types";

/** Resolves a `saveLabel`/`discardLabel`-shaped prop to what actually renders — see `EditingOptions`'s own doc for why there's no placeholder substitution for the plain-string case. */
function resolveEditLabel(
  label: string | ((changedRowCount: number) => ReactNode) | undefined,
  changedRowCount: number,
  fallback: (changedRowCount: number) => ReactNode,
): ReactNode {
  if (label === undefined) return fallback(changedRowCount);
  return typeof label === "function" ? label(changedRowCount) : label;
}

// Bounded to 3 named ids, then "and N more" — a grid with dozens of
// simultaneously-broken rows would otherwise turn this into an unreadable
// wall of ids; there's no general "human label for a row" concept to fall
// back on, so a row id (whatever the caller's own `getRowId` returns) is the
// only identifying string available here.
function describeErrorRows(editErrors: Map<string, Map<string, string>>): string {
  const rowIds = [...editErrors.keys()];
  const shown = rowIds.slice(0, 3);
  const suffix = rowIds.length > shown.length ? `, and ${rowIds.length - shown.length} more` : "";
  return `row${rowIds.length === 1 ? "" : "s"} ${shown.join(", ")}${suffix}`;
}

export interface EditingBarProps<TRow> {
  editing: EditingOptions<TRow>;
  pendingRowCount: number;
  editErrors: Map<string, Map<string, string>>;
  onSave: () => void;
  onDiscard: () => void;
  /** `data-testid` for the outer bar element. Defaults to `"datagrid-edit-bar"` (also the default for the Save/Discard buttons' own testids, unless overridden below). */
  testIdPrefix?: string;
}

/**
 * The Save/Discard bar `<DataGrid>` and `<TreeDataGrid>` both render above
 * themselves once at least one pending edit exists — shared so the two
 * grids' editing UI (and its `aria-live`/row-naming behavior) can't drift
 * apart from each other.
 */
export function EditingBar<TRow>({
  editing,
  pendingRowCount,
  editErrors,
  onSave,
  onDiscard,
  testIdPrefix = "datagrid",
}: EditingBarProps<TRow>): ReactElement {
  const hasEditErrors = editErrors.size > 0;
  return (
    <div
      data-testid={`${testIdPrefix}-edit-bar`}
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
    >
      {/* `aria-live="polite"` — a screen-reader user gets no other signal that this bar exists at all, let alone that
          its row count or error state just changed, since nothing here is itself focused when it appears. */}
      <span aria-live="polite">
        {pendingRowCount} row{pendingRowCount === 1 ? "" : "s"} changed
        {hasEditErrors && (
          <span className="ml-2 text-destructive">
            Fix the highlighted errors before saving ({describeErrorRows(editErrors)}).
          </span>
        )}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid={`${testIdPrefix}-discard-edits`}
          disabled={editing.saving}
          onClick={onDiscard}
        >
          {resolveEditLabel(editing.discardLabel, pendingRowCount, () => "Discard")}
        </Button>
        <Button
          type="button"
          size="sm"
          data-testid={`${testIdPrefix}-save-edits`}
          disabled={editing.saving || hasEditErrors}
          onClick={onSave}
        >
          {resolveEditLabel(
            editing.saveLabel,
            pendingRowCount,
            (count) => `Save ${count} change${count === 1 ? "" : "s"}`,
          )}
        </Button>
      </div>
    </div>
  );
}
