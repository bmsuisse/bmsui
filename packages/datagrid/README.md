# @bmsuisse/datagrid

Headless-core React datagrid built on [TanStack Table v9](https://tanstack.com/table),
with a shared filter/sort contract (mirrored by the [`bmsdna-datagrid`](../../python/datagrid)
Python package) and shadcn/ui-based primitives. Includes `<DataGrid>`,
`<TreeDataGrid>` (lazy-loading tree grid), `<ColumnSelector>`, row
virtualization, infinite scroll, and column-level filter widgets
(`NumberComparisonFilter`, `NumberHistogramFilter`, enum filters, and more).

## Install

```
npm install @bmsuisse/datagrid
```

Peer dependencies: `react` and `react-dom` (`^18` or `^19`).

## Usage

```tsx
import { DataGrid, type ColumnDef } from "@bmsuisse/datagrid";

const columns: ColumnDef<Row>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
];

<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} />;
```

See [AGENTS.md](../../AGENTS.md) for the full design rationale, and
`packages/datagrid/demo` for a runnable example against both a SQL and a
Meilisearch backend.

## License

[MIT](LICENSE)
