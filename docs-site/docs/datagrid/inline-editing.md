---
title: Inline editing
---

# Inline editing

`editable` turns a column's cells into interactive editors; `editing`
(a prop on `<DataGrid>` itself) turns on the accumulate-then-save workflow
that goes with it. Edits accumulate locally — nothing is written back onto
your `data`, and nothing is sent anywhere — until the user clicks **Save** in
the bar that appears above the grid once at least one pending edit exists.

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

`renderEditCell?: (value, row, onChange, error) => ReactNode` replaces the
default editor for one column entirely:

```tsx
{
  ...ownerColumn,
  editable: true,
  renderEditCell: (value, row, onChange, error) => (
    <MyOwnerPicker value={value} onChange={onChange} error={error} />
  ),
}
```

`onChange` records a new pending value the same way a built-in editor's
`onChange` would — it doesn't itself validate or persist anything.

## Limitations

- No cell-level autosave and no undo history — it's accumulate-then-save,
  all at once, or Discard everything.
- No keyboard cell-to-cell navigation (Tab/arrow keys) between editors —
  each editable cell is a normal focusable control, so native Tab order
  moves through them like any other form, but there's no spreadsheet-style
  arrow-key grid navigation.
- A pending edit keeps the row snapshot from when it was first made; if that
  row is later refetched with different data (e.g. a background poll) while
  the edit is still pending, `onSave` still hands back the older snapshot.
- Not supported on `<TreeDataGrid>` — build inline editing there via a
  custom `column.cell` renderer and your own state, the same way you would
  for any column-level customization `<TreeDataGrid>` doesn't build in.
