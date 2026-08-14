---
title: Columns and filters
---

# Columns and filters

`ColumnDef<TRow>` is a discriminated union on `type`:

```ts
type ColumnDef<TRow> =
  | (BaseColumn<TRow> & { type: "string" })
  | (BaseColumn<TRow> & { type: "number" | "currency"; currency?: string })
  | (BaseColumn<TRow> & { type: "date" | "datetime" })
  | (BaseColumn<TRow> & { type: "boolean" })
  | (BaseColumn<TRow> & { type: "enum"; options: { value: string; label: string }[] });
```

Every `type` gets a working default filter widget for free:

| `type` | default widget | default operator |
| --- | --- | --- |
| `string` | `StringFilter` — text input + operator dropdown (contains / equals / starts with / ends with) | `contains` |
| `enum` | `EnumFilter` — Excel-style checkbox list in a popover, with search and a tri-state "select all" | `in` |
| `boolean` | `BooleanFilter` — 3-way All / Yes / No select | `eq` |
| `number` / `currency` | `NumberRangeFilter` — min/max inputs | `between` (or `gte`/`lte` if only one bound is set) |
| `date` / `datetime` | `DateRangeFilter` — Today / Last 7 days / This month presets + calendar | `between` |

## `sortable` / `filterable` default to `false`

Both are opt-in — a column renders no sort toggle and no filter icon until
you set them explicitly, even though a working widget already exists for
its `type`:

```ts
{
  id: "status", type: "enum", header: "Status", accessorKey: "status",
  sortable: true, filterable: true,
  options: [{ value: "pending", label: "Pending" }, { value: "shipped", label: "Shipped" }],
}
```

## `filterDisplay` — where a filter widget renders

`filterDisplay?: "popover" | "row"` (default `"popover"`) controls this.
`"popover"` is the header-icon + popover every column gets automatically.
`"row"` renders the widget inline in an extra filter row under the header
instead — useful for a widget too wide for a popover, like a slider. That
row is entirely opt-in: it only appears once at least one visible,
filterable column sets `filterDisplay: "row"`.

## `renderFilter` — a custom widget for one column

`renderFilter?: (value, onChange, filter) => ReactNode` overrides the
type-based default for a single column. The third argument is the grid's
full current filter state — needed by widgets like `NumberHistogramFilter`
below, whose domain has to account for every *other* active filter.

### `NumberHistogramFilter` + `facetedNumberValues`

A richer alternative to the plain min/max `NumberRangeFilter`: a log-scale
histogram behind a dual-thumb slider, for a numeric column worth showing
visually (price, revenue, rating):

```tsx
{
  ...priceColumn, filterable: true, filterDisplay: "row",
  renderFilter: (value, onChange, filter) => (
    <NumberHistogramFilter
      column={priceColumn}
      value={value}
      onChange={onChange}
      allValues={facetedNumberValues(allRows, priceColumn, filter)}
      bare={false}
    />
  ),
}
```

`facetedNumberValues(data, column, filter)` excludes just `column`'s own
active filter while still applying every other one — so the histogram's own
domain never shrinks as the user narrows *that* column's range (a real bug
this fixed), and filtering one numeric column doesn't warp another's
histogram. In `"server"` mode, pass `loadValues: () => Promise<...>`
instead of `allValues` — see the exported types for the exact signature.

Pass `bare={false}` under `filterDisplay: "row"` (no wrapping popover of its
own needed); omit it (or pass `true`) under the default `"popover"` display,
so this component's own trigger doesn't nest a second popover inside the
grid's.

## Other column options

- **`sortDescFirst?: boolean`** — for a column whose "interesting" direction
  is descending (revenue, a risk score): flips the sort cycle to
  desc → asc → none.
- **`group?: string`** — only affects [`<ColumnSelector>`](/datagrid/column-selector),
  not `<DataGrid>` itself. Columns sharing a `group` are shown together
  under that label in the selector.
- **`headerGroup?: string`** — spans contiguous *visible* columns under one
  label in an extra header row (e.g. several sub-columns under one
  campaign name). Purely positional and rendering-only — sort/filter/
  resize/pin all keep working normally on the grouped columns.
- **`pinned?: "left" | "right"`** — sticks a column to either edge of the
  grid's own scroll container. Give a pinned column an explicit `width`;
  otherwise offset math falls back to a fixed 150px per column.
- **`renderHeader?: (column) => ReactNode`** — overrides the header cell's
  content (the sort caret still renders alongside it). Don't return a
  nested `<button>` or other focusable element — it's already inside the
  grid's own sort-toggle button.

## `enableColumnResizing`

`DataGridProps.enableColumnResizing?: boolean` (default `false`) adds a drag
handle to every column's trailing edge. Turning it on gives *every* column a
concrete pixel width, trading natural content-driven widths for resizability
across the board — leave it off unless the grid actually needs manual
resize.
