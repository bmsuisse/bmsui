---
title: TreeDataGrid
---

# `<TreeDataGrid>`

A lazy-loading tree grid for hierarchical data — org charts, nested
categories, folder trees — reusing the exact same `ColumnDef<TRow>` system
`<DataGrid>` uses, rather than a second column-definition system.

By default it renders the tree in the order `data` gives it, with no sort
or filter controls. Sorting and filtering are opt-in — see
[Sort and filter](#sort-and-filter) below.

```tsx
<TreeDataGrid
  columns={columns}
  data={roots}
  getRowId={(row) => row.id}
  getChildren={() => undefined}
  hasChildren={(row) => row.role !== "Employee"}
  onLoadChildren={(row) => fetchChildren(row.id)}
/>
```

## Node shape

Accessor-based, matching `<DataGrid>`'s `getRowId` convention rather than
requiring a fixed field shape on `TRow`:

- **`getRowId`** — as in `<DataGrid>`.
- **`getChildren`** — already-loaded children for a node, if any.
- **`hasChildren`** (optional) — kept independent of `getChildren` on
  purpose: a node can know it has children the backend hasn't sent yet.
  Omit it only for a fully eager tree, where it defaults to
  `getChildren(row)?.length > 0`. A lazy tree must supply it explicitly.

## Sort and filter

Pass `gridState` and `onGridStateChange` together (fully controlled, no
internal fallback) and every `sortable`/`filterable` column gets the same
header sort toggle and filter popover `<DataGrid>` has:

```tsx
const [gridState, setGridState] = useState<Pick<GridState, "filter" | "sort">>({ filter: null, sort: [] });

<TreeDataGrid gridState={gridState} onGridStateChange={setGridState} /* columns, data, ... */ />
```

- A node stays when it matches every filter **or has a descendant that
  does**, so a match always shows under its ancestors — and those ancestors
  open automatically (the user can still collapse one; it stays collapsed
  until the filter changes).
- Siblings are sorted at every level.
- Operators mean exactly what they mean in a `"client"` `<DataGrid>`
  (`evaluateFilter` + `processClientData`).
- Only **loaded** nodes are searched: a lazy node never expanded can't
  reveal a match below it.

The same logic is exported as `filterSortTree(roots, state, { getRowId,
getChildren, columns, childrenMap })` for use outside the grid.

## Lazy loading

**`onLoadChildren`** is the only thing that makes a node lazy — omit it
entirely for a fully eager tree. Results are cached per node id for the
component's lifetime: collapsing and re-expanding a node never refetches.

A failed `onLoadChildren` call surfaces inline, on the parent row itself
("Failed to load. Retry"), rather than as a silent unhandled rejection or a
synthetic extra error row.

```tsx
async function loadChildren(row: OrgRow) {
  const res = await fetch(`/api/org/${row.id}/children`);
  if (!res.ok) throw new Error("Failed to load children");
  return res.json();
}
```

## No implicit reset on `data` changes

`<TreeDataGrid>` does not clear expanded state or the children cache when
`data`'s identity changes. If you need a full reset — e.g. switching to a
genuinely different root entity — remount the component with a `key` prop.

## Inline editing

`<TreeDataGrid>` supports the exact same `editable`/`editing` workflow
[`<DataGrid>` does](/datagrid/inline-editing) — click any editable cell in a
row to turn every editable column in that row into editors, edit row by row
(one active at a time), accumulate edits locally, Save/Discard as a batch.
Same `EditingOptions<TRow>` type, same default editors per `column.type`,
same `validateEdit`/`renderEditCell`/`autoFocus` contract:

```tsx
<TreeDataGrid
  columns={columns}
  data={roots}
  getRowId={(row) => row.id}
  getChildren={(row) => row.children}
  editing={{
    onSave: async (edits) => {
      await api.updateNodes(edits);
      // ...apply edits back onto your own tree state
    },
  }}
/>
```

Works on nodes at any depth, not just root rows — expand a node and edit its
children exactly the same way. The only difference from `<DataGrid>`: the
Save/Discard bar's `data-testid`s are prefixed `tree-datagrid-` instead of
`datagrid-` (`tree-datagrid-edit-bar`/`-save-edits`/`-discard-edits`).

## Other notes

- The **tree column** (indentation + expand/collapse chevron) is whichever
  column's `id` matches `treeColumnId` (defaults to `columns[0]`); every
  other column renders exactly as it would in `<DataGrid>`.
- **Virtualized** via `@tanstack/react-virtual` once the flattened
  (visible) row count exceeds `virtualizeThreshold` (default 100).
- **`rowActions`** reuses the same `MenuItem<TRow>` contract `<DataGrid>`'s
  `rowActions` prop uses.
- **Row selection** (`selectedIds`/`onSelectedIdsChange`) is built in, with
  the same tri-state (checked/indeterminate) checkbox behavior — but any
  *cascade* semantics (selecting a parent selects its descendants, etc.)
  are the caller's job, via `onSelectedIdsChange` or the
  `getRowSelectionState` override.
- **`maxBodyHeight`** takes pixels or any CSS length; `"100%"` fills a
  bounded parent (e.g. a `flex-1 min-h-0` box).
- **`activeRowId` / `onActiveRowChange`** — same highlighted-row props as
  `<DataGrid>`.

See the [live demo](https://bmsuisse.github.io/bmsui/demo/datagrid/) for a complete 3-level lazy org
chart, including one node whose first load intentionally fails, to exercise
the error+retry UI.
