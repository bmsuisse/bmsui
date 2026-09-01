---
title: Inline editing
---

# Inline editing

`editable` turns a column's cells into interactive editors; `editing`
(a prop on `<DataGrid>` itself) turns on the accumulate-then-save workflow
that goes with it. For the "true spreadsheet" alternative — range-select,
paste, fill-handle, every change applying immediately — see
[Cell editing](/datagrid/cell-editing) instead; the two are mutually
exclusive. Cells stay static text until clicked — clicking (or
pressing Enter/Space on) any editable cell in a row turns **every** editable
column in that row into editors at once, with focus landing on the cell that
was actually clicked. **At most one row is ever in edit mode at a time** —
clicking into a different row switches to it, editing row by row rather than
several at once. Edits still accumulate locally across rows — nothing is
written back onto your `data`, and nothing is sent anywhere — until the user
clicks **Save** in the bar that appears above the grid once at least one
pending edit exists; switching away from a row you've already changed keeps
that change pending (you'll see it reflected in the row's static text), it
just isn't shown as an editor anymore until you click back into it.

```tsx
<DataGrid
  columns={columns}
  dataSource={{ mode: "client", data: tasks }}
  getRowId={(row) => row.id}
  editing={{
    onSave: async (edits) => {
      await api.updateTasks(edits); // edits: EditedRow<Task>[]
      setTasks((prev) =>
        prev.map((task) => {
          const edit = edits.find((e) => e.rowId === task.id);
          return edit ? { ...task, ...edit.values } : task;
        }),
      );
    },
  }}
/>
```

Mark whichever columns should be editable:

```tsx
const columns: ColumnDef<Task>[] = [
  { id: "title", type: "string", header: "Task", accessorKey: "title", editable: true },
  { id: "owner", type: "enum", header: "Owner", accessorKey: "owner", editable: true, options: [...] },
  { id: "hours", type: "number", header: "Est. hours", accessorKey: "hours", editable: true },
  { id: "done", type: "boolean", header: "Done", accessorKey: "done", editable: true },
  { id: "due", type: "date", header: "Due", accessorKey: "due", editable: true },
];
```

A column with `editable` set but no `editing` prop on `<DataGrid>` just
renders as static text, same as if `editable` were never set — the two only
do anything together.

## Default editors, by column `type`

Same "every type gets a working default, for free" pattern the filter
widgets use:

| `type` | default editor | emits |
|---|---|---|
| `string` | text input | `string` |
| `number` / `currency` | number input | `number`, or `null` when emptied |
| `boolean` | checkbox | `boolean` |
| `enum` | single-value select over `column.options` | the selected option's `value` |
| `date` / `datetime` | native date / datetime-local input | a `Date`, or `null` when emptied |

`datetime`'s editor preserves seconds (the input's own value string includes
them, with `step={1}` so the browser's picker shows a seconds field) —
milliseconds are still dropped, since sub-second precision on a
grid-edited datetime column is enough of an edge case to leave unhandled.

`editable` can also be a predicate, for per-row control (e.g. a locked row):

```tsx
{ ...column, editable: (row) => !row.locked }
```

## `EditedRow` — what `onSave` receives

```ts
interface EditedRow<TRow> {
  rowId: string;
  row: TRow;    // the row as it looked when its first pending edit was made
  values: Record<string, unknown>; // changed columns only, keyed by column id
}
```

`values` is keyed by column id rather than being a patched `TRow` — that
works the same way whether a column reads its value via `accessorKey` (an
obvious field to patch) or `accessorFn` (a derived value with no single field
of `TRow` an edit could write back onto).

**Reject to keep edits, resolve to clear them.** `<DataGrid>` keeps every
pending edit exactly as it was until `onSave` settles: throw or reject to
leave everything in place (e.g. your server rejected the request) — show
your own error UI, since `<DataGrid>` surfaces nothing of its own for that
case. Resolve (or just return) normally and every pending edit included in
that call clears.

## Validation

`column.validateEdit?: (value, row) => string | undefined` returns a message
to block Save (shown under the cell, the whole Save button disabled) until
the value is fixed or reverted to its original:

```tsx
{
  ...titleColumn,
  editable: true,
  validateEdit: (value) => (typeof value === "string" && value.trim() === "" ? "Title is required" : undefined),
}
```

## Save/Discard labels — there's no i18n layer here

This package has no translation/templating system anywhere — `saveLabel`/
`discardLabel` are either a plain string (rendered as-is, no `{count}`
placeholder substitution) or a function for a count-aware label:

```tsx
<DataGrid
  // ...
  editing={{
    onSave,
    saveLabel: (count) => `Apply ${count} update${count === 1 ? "" : "s"}`,
    discardLabel: "Cancel",
  }}
/>
```

Defaults to `` `Save ${count} change${count === 1 ? "" : "s"}` `` and
`"Discard"`.

## `saving` — while your own request is in flight

```tsx
const [saving, setSaving] = useState(false);

<DataGrid
  // ...
  editing={{
    saving,
    onSave: async (edits) => {
      setSaving(true);
      try {
        await api.save(edits);
      } finally {
        setSaving(false);
      }
    },
  }}
/>
```

Disables both Save and Discard while `true` — `<DataGrid>` never infers this
on its own, since `onSave` resolving doesn't necessarily mean your own
downstream work (a refetch, a toast) is done too.

## Overriding a column's editor

`renderEditCell?: (value, row, onChange, error, autoFocus) => ReactNode`
replaces the default editor for one column entirely:

```tsx
{
  ...ownerColumn,
  editable: true,
  renderEditCell: (value, row, onChange, error, autoFocus) => (
    <MyOwnerPicker value={value} onChange={onChange} error={error} autoFocus={autoFocus} />
  ),
}
```

`onChange` records a new pending value the same way a built-in editor's
`onChange` would — it doesn't itself validate or persist anything.
`autoFocus` is `true` for exactly the one cell whose click activated the
row — forward it to your control's own native `autoFocus` (or call
`.focus()` yourself in an effect if it doesn't take one) so the activating
click also focuses the field the user actually clicked, not some other cell
in the same row.

## Click-to-activate, not always-on inputs

A cell being `editable` doesn't mean it's always rendered as an input —
that would mean an editors-everywhere table even for rows nobody's touching.
Instead, `<DataGrid>` renders `cell-${rowId}-${columnId}` static content for
an editable cell until it's activated; clicking it (or its row's any other
editable cell) swaps every editable column in that row over to its editor at
once. This is purely a display-mode toggle, independent of whether anything
has actually changed yet — clicking into a row with nothing to change yet
still activates it, and it stays active until you either edit it and Save/
Discard, or click into a *different* row (which deactivates this one — see
below).

**At most one row active at a time.** Clicking into another row deactivates
whichever row was active before it; there's no way to have two rows' worth
of editors open simultaneously. This does **not** discard whatever you were
mid-typing — a deactivated row keeps showing any pending edit in its static
text (not the original, stale value), and that edit is still fully part of
what Save commits. Only Save or Discard actually clears a pending edit;
switching rows just changes which row's fields you're currently looking at.

## Keyboard, focus, and accessibility

- **Escape** reverts the focused cell to its original (never-edited) value —
  just that one cell, not the whole row, and the row stays active. Other
  cells' pending edits on the same row are untouched.
- Every built-in editor sets `aria-invalid` **and** `aria-describedby`
  (pointing at the error text's own `id`, via the exported `editErrorId(rowId,
  columnId)` helper) whenever `validateEdit` fails — a screen reader reads the
  actual message, not just "invalid." A custom `renderEditCell` should do the
  same for its own error text.
- The Save/Discard bar's message is `aria-live="polite"`, so its row count
  and "fix the highlighted errors" text are announced as they change — the
  bar itself is never focused when it appears, so without this a screen
  reader user would have no signal it exists.
- The blocked-Save message names which rows still have errors (bounded to 3
  ids, then "and N more"), not just a generic "something's wrong."

## Limitations

- No cell-level autosave and no undo history — it's accumulate-then-save,
  all at once, or Discard everything.
- No keyboard cell-to-cell navigation (Tab/arrow keys) between editors —
  each editable cell is a normal focusable control once its row is active,
  so native Tab order moves through them like any other form, but there's no
  spreadsheet-style arrow-key grid navigation, and no keyboard shortcut to
  activate a row without clicking (or Enter/Space-ing) one of its cells
  first.
- A pending edit keeps the row snapshot from when it was first made; if that
  row is later refetched with different data (e.g. a background poll) while
  the edit is still pending, `onSave` still hands back the older snapshot.
- Also available on [`<TreeDataGrid>`](/datagrid/tree-data-grid#inline-editing)
  — same `EditingOptions<TRow>` contract, works at any depth in the tree, not
  just root rows. The only difference is the Save/Discard bar's `data-testid`
  prefix (`tree-datagrid-` instead of `datagrid-`).
