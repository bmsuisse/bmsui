---
title: TreeDataGrid
---

# `<TreeDataGrid>`

A lazy-loading tree grid for hierarchical data — org charts, nested
categories, folder trees — reusing the exact same `ColumnDef<TRow>` system
`<DataGrid>` uses, rather than a second column-definition system.

It deliberately has **no sorting and no client-side filtering**: hierarchy
order comes from the backend, and "filtering" a tree usually means asking
for a differently-shaped tree, which is application-specific rather than
something a generic component can own.

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

## Other notes

- The **tree column** (indentation + expand/collapse chevron) is whichever
  column's `id` matches `treeColumnId` (defaults to `columns[0]`); every
  other column renders exactly as it would in `<DataGrid>`.
- **Virtualized** via `@tanstack/react-virtual` once the flattened
  (visible) row count exceeds `virtualizeThreshold` (default 100).
- **`rowActions`** reuses the same `MenuItem<TRow>` contract `<DataGrid>`'s
  `rowActions` prop uses.
- Row selection, inline cell editing, and server-driven filtering are
  intentionally **not** built in — those are application-specific and
  compose fine via a custom `column.cell` renderer and your own state, the
  same way they would on top of `<DataGrid>`.

See the [live demo](https://bmsuisse.github.io/bmsui/demo/datagrid/) for a complete 3-level lazy org
chart, including one node whose first load intentionally fails, to exercise
the error+retry UI.
