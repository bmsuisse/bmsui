import { defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { coerceValueForColumn } from "./coerce";

/** Why a fill/paste left a target cell untouched. */
export type SkipReason = "not-editable" | "incompatible-type" | "validation";

export interface SkippedCell<TRow> {
  rowId: string;
  columnId: string;
  row: TRow;
  reason: SkipReason;
  /** The target column's `validateEdit` message, when `reason` is `"validation"`. */
  message?: string;
  /** The value that was refused. */
  value: unknown;
}

export type AdaptResult = { value: unknown } | { reason: Exclude<SkipReason, "not-editable">; message?: string };

function sameKind<TRow>(source: ColumnDef<TRow>, target: ColumnDef<TRow>, value: unknown): boolean {
  if (source.type !== target.type) return false;
  if (target.type === "enum") return value === null || value === undefined || target.options.some((option) => option.value === value);
  return true;
}

/**
 * Turns `value` (taken from `source`, a cell in another — or the same —
 * column) into something `target` accepts, the way a paste would: same column
 * type passes through untouched; a different type goes through its clipboard
 * text and `coerceValueForColumn` (so "6" fills a number column, "Alice"
 * matches an enum by label), and is refused when it doesn't convert. The
 * target's `validateEdit` then has the final say when `validate` is on, so a
 * fill/paste can never write a value the cell's own editor would reject.
 */
export function adaptValueForColumn<TRow>(
  target: ColumnDef<TRow>,
  targetRow: TRow,
  source: { column: ColumnDef<TRow>; row: TRow } | undefined,
  value: unknown,
  validate: boolean,
): AdaptResult {
  let adapted: unknown = value;
  if (!source || !sameKind(source.column, target, value)) {
    const text = source
      ? source.column.formatForClipboard
        ? source.column.formatForClipboard(value, source.row)
        : defaultFormat(source.column, value)
      : String(value ?? "");
    const coerced = coerceValueForColumn(target, text);
    if (!coerced) return { reason: "incompatible-type" };
    adapted = coerced.value;
  }
  if (validate) {
    const message = target.validateEdit?.(adapted, targetRow);
    if (message) return { reason: "validation", message };
  }
  return { value: adapted };
}
