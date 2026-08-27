/**
 * One row carrying at least one pending edit, as handed to
 * `DataGridEditingOptions.onSave`. `values` is keyed by column id and holds
 * only the columns that actually changed — not a full patched `TRow` — so
 * this works uniformly for `accessorKey` columns (which have one obvious
 * field to write back into) and `accessorFn` columns (which may not: a
 * derived/computed column has no single field of `TRow` an edit could patch
 * back onto).
 */
export interface EditedRow<TRow> {
  rowId: string;
  /** The row as it looked when its first still-pending edit was made — not necessarily the row's current on-screen data if it was refetched since. */
  row: TRow;
  values: Record<string, unknown>;
}
