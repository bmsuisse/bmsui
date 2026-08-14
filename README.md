# bmsui

Shared, framework-level React UI and data-grid packages, plus the Python
counterpart for turning a frontend filter/sort contract into SQL or a
Meilisearch filter string.

| Package | Description |
| --- | --- |
| [`@bmsuisse/ui`](packages/ui) | shadcn/ui-based React primitives and composed patterns (Modal, FormField, AlertBox, StatusBadge, LoadingSpinner, Sheet, Tooltip, Combobox). |
| [`@bmsuisse/datagrid`](packages/datagrid) | Headless-core React datagrid (TanStack Table v9) with a shared filter/sort contract, built on shadcn/ui primitives. |
| [`bmsdna-datagrid`](python/datagrid) | Turns that same filter/sort contract into a parameterized SQL statement (via `sqlglot`) or a Meilisearch filter string. |

See [AGENTS.md](AGENTS.md) for the detailed design rationale behind each
package, and the per-package READMEs for usage.

## Development

This is a [bun](https://bun.sh) workspace.

```
bun install
bun run check   # typecheck + vitest for @bmsuisse/ui and @bmsuisse/datagrid
```

The Python package uses [uv](https://docs.astral.sh/uv/):

```
cd python/datagrid
uv sync --all-extras --all-groups
uv run ruff check .
uv run ty check .
uv run pytest
```

## Releasing

Each package's version is bumped independently in its own `package.json` /
`pyproject.toml`. On every push to `main`, CI compares each package's current
version against its most recent `<pkg>@<version>` git tag; a package whose
version increased is built, published (npm or PyPI), tagged, and gets its own
GitHub Release. Packages whose version didn't change are left untouched. See
[`.github/workflows/release.yml`](.github/workflows/release.yml).

## License

[MIT](LICENSE)
