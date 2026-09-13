# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

React developers building data-dense internal tools, dashboards, and admin/back-office apps — both within bmsuisse's own product suite (e.g. the sibling `@bmsuisse/datagrid` package) and, since this is published to npm, external OSS consumers with similar needs.

## Product Purpose

`@bmsuisse/ui` is a shared library of shadcn/ui-based React primitives (Button, Input, Dialog, Popover, Select, Sheet, Tooltip, …) and composed patterns (Modal, ConfirmDialog, FormModal, FormField, AlertBox, StatusBadge, LoadingSpinner/Overlay, Combobox, SearchPanel, KpiCard, Sidebar, …), so that consuming apps get consistent, accessible, production-ready UI building blocks without re-implementing them per project.

## Positioning

A Radix + shadcn/ui foundation composed into higher-level, ready-to-use patterns (not just raw primitives), tuned for operate-mode surfaces — dashboards and admin tools — rather than marketing/persuasion UI.

## Operating Context

Consumed as an npm dependency (peer deps: React 18/19) by React apps, most commonly data-dense internal tools and dashboards. `packages/ui/demo` is the runnable reference app exercising every component.

## Capabilities and Constraints

- Built on Radix UI primitives + class-variance-authority + Tailwind-merge; styling follows the shadcn/ui convention.
- Ships as ESM only (`dist/index.js` + types), no CSS runtime dependency beyond consumer's Tailwind setup.
- Components must work standalone (tree-shakeable, `sideEffects: false`).

## Evidence on Hand

- `packages/ui/README.md` — install/usage docs.
- `packages/ui/demo` — runnable example of every component.
- `AGENTS.md` (repo root) — design rationale referenced from the README.

## Product Principles

- Operate mode by default: scanability, consistency, and native interaction expectations outrank visual expression.
- Compose on top of Radix rather than reinventing accessible interaction patterns.
- Every component must be usable standalone and tree-shakeable — no hidden coupling between patterns.
- Consistency across components (spacing, tokens, variants) matters more than any single component's novelty, since this is a shared system many apps depend on.

## Accessibility & Inclusion

Baseline: WCAG 2.1 AA, inherited largely for free from Radix primitives; no additional binding brand/accessibility constraints recorded yet.
