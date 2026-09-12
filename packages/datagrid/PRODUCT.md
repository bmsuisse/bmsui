# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

React developers building data-dense internal tools, dashboards, and admin/back-office apps that need to display and edit tabular data — both within bmsuisse's own products and, since this is published to npm, external OSS consumers with similar needs.

## Product Purpose

`@bmsuisse/datagrid` is a headless-core React datagrid built on TanStack Table v9, with a shared filter/sort contract mirrored by the `bmsdna-datagrid` Python package, and shadcn/ui-based primitives. It provides `<DataGrid>`, `<TreeDataGrid>` (lazy-loading tree grid), `<ColumnSelector>`, row virtualization, infinite scroll, and column-level filter widgets (number comparison, histogram, enum, …), so consuming apps get a production-ready, high-performance grid without building filtering/sorting/virtualization/editing logic themselves.

## Positioning

Headless-core (logic-first, TanStack Table under the hood) rather than a fully-skinned grid product, but ships with shadcn/ui-based default widgets so it's usable out of the box; the filter/sort contract is shared with a server-side Python counterpart, so client and server stay in lockstep — a neighboring grid library can't offer that without owning both sides of the stack.

## Operating Context

Consumed as an npm dependency (peer deps: React 18/19) by React apps displaying/editing tabular data, often backed by SQL or Meilisearch. `packages/datagrid/demo` is the runnable reference app against both backends.

## Capabilities and Constraints

- Built on TanStack Table v9 + TanStack Virtual, with `@bmsuisse/ui`-style Radix/shadcn primitives for filter widgets and menus.
- Ships as ESM only (`dist/index.js` + types), tree-shakeable (`sideEffects: false`).
- Cell editing, column menus, tree/hierarchical rows, and lazy loading are first-class, not bolted on.
- The filter/sort contract must stay compatible with the Python `bmsdna-datagrid` package — it's a cross-language protocol, not just a UI concern.

## Evidence on Hand

- `packages/datagrid/README.md` — install/usage docs.
- `packages/datagrid/demo` — runnable example against SQL and Meilisearch backends.
- `AGENTS.md` (repo root) — design rationale referenced from the README.
- `python/datagrid` — the mirrored server-side filter/sort contract.

## Product Principles

- Operate mode by default: scanability, density, and predictable interaction outrank visual expression.
- Headless-first: logic and contract (filtering, sorting, virtualization) are the product; default widgets are a convenience, not the point.
- Keep the client filter/sort contract in lockstep with the Python package — never drift the two independently.
- Every widget must perform at scale (virtualized rows, large column counts) — correctness under load matters more than any single interaction's polish.

## Accessibility & Inclusion

Baseline: WCAG 2.1 AA, inherited largely for free from Radix primitives; no additional binding brand/accessibility constraints recorded yet.
