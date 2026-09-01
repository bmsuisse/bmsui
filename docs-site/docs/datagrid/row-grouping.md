---
title: Row grouping
---

# Row grouping

`groupBy` buckets the grid's already-filtered/sorted/paginated rows into
groups, rendering one full-width, collapsible group-header row before each
bucket's own rows — in first-seen bucket order. Rows are never re-sorted to
cluster a group together; whichever key your own sort surfaces first is the
first group rendered.

```tsx
<DataGrid
  columns={columns}
  dataSource={{ mode: "client", data: approvals }}
  getRowId={(row) => row.id}
  groupBy={(row) => row.customerName}
/>
```

Single level only — there's no nested grouping, and no built-in
aggregate/summary calculation. A caller wanting a subtotal computes it
themselves off the bucket's row array, in `renderGroupHeader` below.

## Customizing the header

`renderGroupHeader` overrides a group's header content — it defaults to
`` `${key} (${rows.length})` ``:

```tsx
<DataGrid
  // ...
  groupBy={(row) => row.customerName}
  renderGroupHeader={(key, rows, expanded) => `${key} (${rows.length} pending)`}
/>
```

It receives the group's `key`, its full (unfiltered-by-collapse) row array,
and whether it's currently expanded.

## Expand/collapse state

Every group starts expanded by default; set `defaultGroupsExpanded={false}`
to start newly-seen groups collapsed instead.

To drive or persist collapse state yourself, pass `expandedGroups` and
`onExpandedGroupsChange` together (the same controlled/uncontrolled
convention `columnSizing` and `selectedIds` use) — omit both to let
`<DataGrid>` own the state internally:

```tsx
const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

<DataGrid
  // ...
  groupBy={(row) => row.customerName}
  expandedGroups={expandedGroups}
  onExpandedGroupsChange={setExpandedGroups}
/>
```

The record is keyed by the `groupBy` key; a key absent from it falls back to
`defaultGroupsExpanded`.

## Sticky headers, zebra striping

A group's header row sticks to the top of the scroll container, right below
the real column header, while its member rows scroll past underneath it.

The header row's shaded background follows the grid's own `zebra` prop
(default `true`) — set `zebra={false}` to turn it off, same as it turns off
the alternating row stripes.

## Paging and virtualization

`groupBy` operates on whatever rows the grid already resolved to — i.e. the
current page, if paginated — with no special-casing to keep one group's full
membership together across pages. Set `showPagination={false}` if that
matters for a given grid: in `"client"` mode, with no explicit `pageSize`
given, that alone now resolves to an effectively unbounded page, so every
row is visible to `groupBy` without also having to pick a large `pageSize`
yourself. In `"server"` mode the row count isn't known client-side up
front, so this still depends on your `dataSource` actually returning every
row for a given request.

**Not supported together with `virtualize` yet.** Interleaving synthetic
group-header rows and hiding a collapsed bucket's rows needs a flattened
index space to virtualize correctly. Setting both `groupBy` and `virtualize`
silently disables virtualization (the grid still renders grouped, just
fully, not virtualized) rather than mis-rendering.
