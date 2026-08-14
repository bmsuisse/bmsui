---
title: Server vs. client mode
---

# Server vs. client mode

`<DataGrid>` takes exactly one `DataSource`:

```ts
type DataSource<TRow> =
  | { mode: "client"; data: TRow[] }
  | {
      mode: "server";
      data: TRow[];
      rowCount: number;
      loading?: boolean;
      onStateChange: (state: GridState) => void;
    };
```

## `"client"` mode

Hand it the full array. `<DataGrid>` filters (via the exported
`evaluateFilter`), multi-column sorts, and paginates entirely in-memory —
you do nothing else:

```tsx
<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />
```

Client mode still paginates according to `GridState.pageSize` — for a large
in-memory array you want to render *all* of at once (e.g. a virtualized
infinite-scroll list), use `"server"` mode instead, growing `data` yourself;
see the [virtualize + infinite scroll demo](https://bmsuisse.github.io/bmsui/demo/datagrid/) for a
worked example.

## `"server"` mode

`data` must already be exactly the current page — pre-filtered and
pre-sorted by you. `<DataGrid>` calls `onStateChange` on every sort/filter/
page change — **debounced ~300ms while typing a filter**, **immediately**
for sort/page changes — and simply renders whatever `data`/`rowCount` you
hand back on the next render. It never re-filters or re-sorts server-mode
data itself: if `onStateChange` doesn't apply the new `GridState` and
refetch, nothing changes on screen.

```tsx
function useOrdersDataSource(): DataSource<Order> {
  const [state, setState] = useState<GridState>({ filter: null, sort: [], page: 0, pageSize: 20 });
  const [rows, setRows] = useState<Order[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchOrders(state)
      .then(({ rows, rowCount }) => {
        setRows(rows);
        setRowCount(rowCount);
      })
      .finally(() => setLoading(false));
  }, [state]);

  return { mode: "server", data: rows, rowCount, loading, onStateChange: setState };
}
```

This is exactly the pattern the [live demo](https://bmsuisse.github.io/bmsui/demo/datagrid/)'s
`e2e/server` FastAPI backend uses on the real repository — one `GridState`
in, one `{ rows, rowCount }` out, translated into a SQL query or a
Meilisearch filter string by the companion
[`bmsdna-datagrid`](https://github.com/bmsuisse/bmsui/tree/main/python/datagrid)
Python package. The public demo deployed from this docs site swaps that
backend out for a bundled in-memory dataset in `"client"` mode instead — the
same component, a different `DataSource`.

## Shared `GridState`/`FilterDescriptor` contract

`GridState`, `FilterDescriptor`, `CompositeFilterDescriptor`, and
`SortDescriptor` are the same shapes on both sides of a server-mode grid —
serialize `GridState` as JSON, send it to your backend, and either hand-roll
the query or reuse `bmsdna-datagrid` (Python) to turn it into a
parameterized SQL statement or a Meilisearch filter string automatically.
