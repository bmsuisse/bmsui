import type { ReactNode } from "react";

/**
 * One row carrying at least one pending edit, as handed to
 * `EditingOptions.onSave`. `values` is keyed by column id and holds
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

/**
 * Drives the built-in inline-editing workflow shared by `<DataGrid>` and
 * `<TreeDataGrid>`: cells in a column with `editable` set become
 * interactive editors, and every change accumulates locally (never written
 * back onto the caller's `data`, never sent anywhere on its own) until the
 * user clicks the Save button this renders in a bar above the grid — or
 * Discard, to drop everything back to unedited. There is no partial/per-cell
 * autosave; see `onSave` below for the all-or-nothing commit point.
 *
 * This package has no translation/i18n layer anywhere — `saveLabel`/
 * `discardLabel` are plain strings (or a count-aware function) you supply
 * directly, the same convention every other caller-facing string in this
 * package already follows (`header`, menu item labels, etc.).
 */
export interface EditingOptions<TRow> {
  /**
   * Called once, when the user clicks Save, with every row currently
   * holding at least one pending edit and no validation error
   * (`validateEdit`-failing rows are excluded — Save itself stays disabled
   * while ANY row has one, so in practice this only ever fires once none
   * do). Pending-edit state stays exactly as it was until this resolves:
   * **throw or reject to leave every pending edit in place** (e.g. your own
   * save request failed) rather than losing the user's in-progress edits —
   * nothing of this package's own surfaces for that case, so show your own
   * error UI. Resolve (or return) normally to clear every pending edit that
   * was included in this call — and only those; an edit made to a different
   * cell while this was still in flight is never touched by this call's own
   * resolution, whenever it lands.
   */
  onSave: (edits: EditedRow<TRow>[]) => void | Promise<void>;
  /** Called after the built-in Discard button clears every pending edit. Omit for no extra behavior beyond that clear. */
  onDiscard?: () => void;
  /**
   * Label for the Save button. A plain string renders as-is — no
   * placeholder substitution, since there's no templating/i18n layer here.
   * Pass a function instead for a count-aware label, e.g. `(count) =>
   * `Apply ${count} change${count === 1 ? "" : "s"}``. Defaults to that
   * exact "Save N change(s)" function.
   */
  saveLabel?: string | ((changedRowCount: number) => ReactNode);
  /** Label for the Discard button. Same convention as `saveLabel`. Defaults to `"Discard"`. */
  discardLabel?: string | ((changedRowCount: number) => ReactNode);
  /**
   * Disables the Save and Discard buttons and shows Save in a pending
   * state — set this while your own `onSave` promise is in flight (a
   * caller-driven flag, not something this package infers on its own, since
   * `onSave` may resolve without the grid ever finding out your own server
   * call afterward e.g. still triggered a background refetch). Defaults to
   * false.
   */
  saving?: boolean;
}
