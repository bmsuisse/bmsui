---
title: ColumnSelector
---

# `<ColumnSelector>`

A column visibility dialog. It's a **controlled** component — same pattern
as the filter widgets, `visibility`/`onVisibilityChange` rather than
internal state — and is not rendered inside `<DataGrid>` automatically; wire
it up yourself, driven by state shared with the grid:

```tsx
const [visibility, setVisibility] = useState<ColumnVisibility>({});

<ColumnSelector
  columns={columns}
  visibility={visibility}
  onVisibilityChange={setVisibility}
  persistKey="orders" // optional — omit for no localStorage interaction at all
/>
<DataGrid
  columns={columns}
  columnVisibility={visibility}
  onColumnVisibilityChange={setVisibility}
  dataSource={dataSource}
  getRowId={(row) => row.id}
/>
```

## Notes

- **`ColumnVisibility`** is `Record<string, boolean>`, with a *missing* key
  meaning visible — matching TanStack Table's own `VisibilityState`
  convention, so it can be handed straight to a raw TanStack table if you
  ever need to.
- **Grouping** (via a column's `group` string, see
  [Columns and filters](/datagrid/columns-and-filters)) lays groups out
  left-to-right as side-by-side sections inside the dialog, wrapping onto a
  new row rather than growing the dialog indefinitely. The ungrouped
  section (unlabeled) is always first.
- A group header is a **plain, muted label** — no checkbox, no bulk
  select/deselect affordance. Only per-column checkboxes exist.
- It will not let you hide the **last visible column** — that checkbox
  disables itself rather than firing a change that would leave the grid
  with zero visible columns.
- **`persistKey`**, if set, reads/writes
  `localStorage["bmsui-datagrid:columns:" + persistKey]` — read once on
  mount (merged over whatever `visibility` was passed in), written on every
  subsequent user-driven change. Malformed or stale stored JSON is caught
  and ignored rather than thrown.
- `<DataGrid>` only **reads** `columnVisibility` to decide which columns to
  render — it never writes it itself. `<ColumnSelector>` is what drives
  changes.

See the [live demo](https://bmsuisse.github.io/bmsui/demo/datagrid/) for a working example with
grouped columns.
