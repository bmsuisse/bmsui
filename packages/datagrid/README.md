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

### Built-in translations

The grid's texts (filter UI, loading/error states, row/selection labels, the
editing bar, the column selector) ship in **de, fr, it, en, nl, es**. Set the
language once:

```tsx
<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} locale="de-CH" />;

// or for a whole app (also reaches a standalone <ColumnSelector>, filter widgets, …)
<BmsLocaleProvider locale="fr-CH">…</BmsLocaleProvider>;
```

`locale` is a BCP 47 tag: its language picks the texts (`de-CH` → German; an
unsupported language falls back to English) and DateRangeFilter's calendar
follows it (`fr-CH`/`it-CH` use date-fns' Swiss variants). Without a locale
everything stays English. Cell *values* (numbers, dates, Yes/No) are not
localized yet.

### Overriding single texts

Anything you pass explicitly wins over the built-in text of the language.
Pass `filterLabels` (a `Partial<FilterLabels>`; anything omitted keeps the
built-in text, English unless a `locale` is set) to translate or reword them:

```tsx
import { de } from "date-fns/locale";

<DataGrid
  columns={columns}
  dataSource={{ mode: "client", data: rows }}
  filterLabels={{
    selectAll: "Alle auswählen",
    searchPlaceholder: (header) => `${header} suchen…`,
    filterAriaLabel: (header) => `${header} filtern`,
    filterDone: "Fertig", // close button of the mobile filter modal
    dateLocale: de,
  }}
/>;
```

Widgets rendered outside a `<DataGrid>` read the same labels from a
`<FilterLabelsProvider labels={…}>`, or take a per-widget `labels` prop.

See [AGENTS.md](../../AGENTS.md) for the full design rationale, and
`packages/datagrid/demo` for a runnable example against both a SQL and a
Meilisearch backend.

## License

[MIT](LICENSE)
