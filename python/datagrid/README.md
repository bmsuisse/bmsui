# bmsdna-datagrid

Turns the shared frontend filter/sort contract (`FilterDescriptor` /
`CompositeFilterDescriptor` / `SortDescriptor`) into either:

- a parameterized SQL `SELECT` / `COUNT` statement (via `sqlglot`), or
- a Meilisearch filter expression string.

This replaces filter-to-SQL logic that was previously duplicated across
several BMS repos.

See `bmsdna/datagrid/filters.py`, `bmsdna/datagrid/sql.py`, and
`bmsdna/datagrid/meili.py`.
