---
title: Getting started
---

# @bmsuisse/datagrid

A headless-core React data grid built on [TanStack Table v9](https://tanstack.com/table),
with a shared filter/sort contract (mirrored by the
[`bmsdna-datagrid`](https://github.com/bmsuisse/bmsui/tree/main/python/datagrid)
Python package) and shadcn/ui-based primitives.

```bash
npm install @bmsuisse/datagrid
```

Peer dependencies: `react` and `react-dom` (`^18` or `^19`).

## The smallest possible grid

```tsx
import { DataGrid, type ColumnDef } from "@bmsuisse/datagrid";

interface Row {
  id: string;
  name: string;
}

const columns: ColumnDef<Row>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
];

<DataGrid
  columns={columns}
  dataSource={{ mode: "client", data: rows }}
  getRowId={(row) => row.id}
/>;
```

That's a fully working, filterable, sortable grid over an in-memory array —
`<DataGrid>` does the filtering/sorting/pagination itself in `"client"`
mode. See [Server vs. client mode](/datagrid/server-vs-client) for the
other half of the story: paginating against a real backend.

## What's included

- **`<DataGrid>`** — the grid itself: column-typed filter widgets, sorting,
  pagination, row virtualization, infinite scroll, column pinning/resizing,
  row selection, per-row/header action menus, expandable row detail.
- **`<TreeDataGrid>`** — a [lazy-loading tree grid](/datagrid/tree-data-grid)
  for hierarchical data (org charts, nested categories), reusing the same
  column system.
- **`<ColumnSelector>`** — a [column visibility dialog](/datagrid/column-selector)
  with optional grouping and `localStorage` persistence.
- A [column type system](/datagrid/columns-and-filters) that gives every
  column a working default filter widget for free, based on its `type`.

## Try it live

**[Open the interactive demo →](https://bmsuisse.github.io/bmsui/demo/datagrid/)** — the orders grid
above, plus dedicated demos for faceted numeric filters, column
pinning/resizing, spanning header groups, virtualized infinite scroll, and
the lazy-loading tree grid.
