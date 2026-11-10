---
name: bmsui
description: "Use when building or changing React UI in a project that depends on @bmsuisse/ui or @bmsuisse/datagrid (OneSales, OneDocs, CCMT, master-data apps): choosing components, adding dialogs, forms, tables, toasts, empty/error/loading states, dates, search, or navigation."
---

`@bmsuisse/ui` and `@bmsuisse/datagrid` are the shared component libraries for these apps. Use them before writing a local component.

1. Read `node_modules/@bmsuisse/ui/CATALOG.md` first. It lists every export with when to use it. If what you need is there, import it from `@bmsuisse/ui`.
2. Tables with sorting, filtering, paging, grouping, editing or trees: `@bmsuisse/datagrid` (`DataGrid`, `TreeDataGrid`). Read its README in `node_modules/@bmsuisse/datagrid/`.
3. Prefer the composed patterns over raw primitives: `AsyncBoundary` for fetched data, `FormField` around every control, `FormModal`/`ConfirmDialog`/`ResponsivePanel` over raw `Dialog`, `DateInput` over `<input type="date">`, `toast(...)` + one `<Toaster />` for notices, `EmptyState`/`FilteredEmptyState`/`ErrorState` for empty and failed states.
4. User-facing strings: these components take English defaults and a `labels` (or `*Label`) prop. Pass the app's translations through it; don't fork the component to translate it.
5. If the app already has a local copy of something in the catalog (e.g. `components/ui/EmptyState.tsx`), migrate call sites to the library version when you touch them, and delete the local copy once unused.
6. If nothing fits, build it locally in the app. If it's generic and likely needed by another app too, mention that it's a candidate for bmsui (https://github.com/bmsuisse/bmsui).
