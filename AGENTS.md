# AGENTS.md

Guidance for coding agents (Claude Code and others) working in this repo.
Written for this repo itself, and for agents in consuming apps that adopt
`@bmsuisse/datagrid` / `bmsdna-datagrid` instead of their own duplicated
TanStack-Table/filter-to-SQL code.

This file describes what's actually built and tested as of this writing —
if you extend these packages, keep it in sync rather than letting it drift
into aspiration.

## What lives where

```
packages/datagrid/     @bmsuisse/datagrid   — React datagrid (TanStack Table v9)
packages/ui/           @bmsuisse/ui         — shared shadcn/ui-based primitives + composed patterns
python/datagrid/       bmsdna-datagrid   — filter contract -> SQL / Meilisearch
e2e/server/            FastAPI harness backing packages/datagrid/e2e's Playwright specs
```

## `@bmsuisse/ui` — shared primitives and composed patterns

Grew out of a survey of several internal apps' React code looking for
UI patterns duplicated across those codebases (beyond the datagrid/filter
logic above, which already had its own extraction). Structure:

- `packages/ui/src/primitives/` — shadcn/ui-based base components (`Button`,
  `Input`, `Label`, `Textarea`, `Card`, `Badge`, `Dialog`, `Popover`,
  `Select`, `Skeleton`, `DropdownMenu`, `Sheet`, `Tooltip`). These were
  independently copy-pasted across a sales app, a contract-management app,
  and separately in **5 different master-data-management apps** — this
  package is meant to be the one copy going forward.
  `DropdownMenu` is intentionally more complete than the datagrid package's
  internal one (`packages/datagrid/src/components/ui/dropdown-menu.tsx`,
  which only has what `ActionsMenu` needs) — it also has
  `CheckboxItem`/`RadioItem`/`RadioGroup`/`Sub*`/`Shortcut` for general use.
  `Sheet` and `Tooltip` (added in v0.2.0, driven by real gaps found
  integrating the sales app) have no `tailwindcss-animate` dependency anywhere in
  this monorepo — `Sheet`'s slide transition uses a plain
  `transition-transform` + `translate-x`/`translate-y` toggle off Radix's own
  `data-[state=...]` attribute instead of assuming that plugin is installed;
  `Tooltip`'s content has no enter/exit animation classes at all, for the
  same reason. `Button` also gained `secondary`/`link` variants and
  `xs`/`lg`/`icon-xs`/`icon-sm`/`icon-lg` sizes, and `DialogContent` gained
  an opt-out `showCloseButton` prop (default `true`) — all purely additive,
  found missing when comparing against the sales app's own (base-ui-based, see
  below) `Button`/`Dialog` APIs. `DialogContent` also gained a
  `max-h-[85vh] overflow-y-auto` safety net (v0.2.1) — the base primitive
  previously had no built-in scroll handling at all for content taller than
  the viewport, discovered migrating the sales app's `ComposeMailDialog` (a
  tiptap editor + address-chip inputs that can genuinely overflow a short
  viewport). `Button` gained
  `[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0` on its base
  classes (v0.4.5) — the contract-management app's own `Button` had this and
  relied on it everywhere a bare `lucide-react` icon is passed as a child
  with no explicit sizing classes; without it, migrating that app to this
  `Button` would have rendered oversized/unconstrained icons in every icon
  button. `Badge` gained a `warning` variant (v0.4.5, `bg-amber-100`/
  `text-amber-900` with `dark:` shades) for the same reason — the
  contract-management app had one and uses it for pending/warning states
  (e.g. the approvals page), and no equivalent tone existed on this
  package's `Badge` (only `StatusBadge` had warning/amber via its own
  fixed-palette tone map). `Input` gained `min-w-0`, `file:*`, and
  `selection:*` classes (v0.4.6) — the contract-management app's own
  `Input` had these (needed for its `<input type="file">` usages and to
  shrink inside flex rows) and this package's lacked them entirely; found
  after some of that app's call sites had already switched to this `Input`
  while others hadn't, mid-migration. Ref-forwarding was already correct,
  just untested — added a test for it alongside.
- `packages/ui/src/patterns/` — components composed on top of the
  primitives, one subfolder per pattern, each addressing a specific
  duplication found in the survey:
  - `modal/` — `Modal` (base header/body/footer wrapper), `ConfirmDialog`
    (auto-closes on successful confirm, stays open + logs on rejection),
    `FormModal` (wraps a `<form>`, does **not** auto-close after submit —
    that's the caller's call, unlike `ConfirmDialog`). Replaces the same
    Dialog+Header+Title+Footer shape the contract-management app had reimplemented 11 times.
    `FormModal` gained `className` (v0.2.1, matching `Modal`'s own prop —
    it was missing entirely, found migrating `ComposeMailDialog`, which
    needs a narrower/taller dialog than the default) and `submitDisabled`
    (v0.2.1 — disables Save on top of the automatic pending-state disable,
    for client-side-invalid forms; found migrating `PostponeTaskDialog`,
    which needs the submit button disabled until required fields are
    filled, not just during the async save itself). `FormModal` gained
    `submitTestId`/`cancelTestId` (v0.3.1) — the migrated `PostponeTaskDialog`
    silently dropped its own submit button's test id (the pre-migration
    hand-rolled dialog had one; `FormModal` had no way to forward one),
    breaking a Playwright E2E test that waited on it. Same convention as
    `Combobox`'s own `"data-testid"` prop, split into two named props since
    this component renders two buttons.
  - `form-field/` — `FormField`, the "label + input + error/description"
    wrapper. Auto-generates an id via `useId()` unless the child already has
    one or `htmlFor` is passed; wires `aria-invalid`/`aria-describedby` onto
    the single child via `cloneElement`.
  - `alert-box/` — `AlertBox`, an error/warning/info/success banner.
    `error` reuses the shared `destructive` theme token; `warning`/`info`/
    `success` use fixed Tailwind palette colors (amber/sky/emerald) because
    the shared theme has no tokens for those yet — see the comment in
    `AlertBox.tsx` before adding a fourth ad hoc palette choice elsewhere.
  - `status-badge/` — `StatusBadge`, status-string -> color badge. Resolves
    a tone via: explicit `tone` prop > caller's `toneMap` > a small built-in
    English status vocabulary (`approved`/`pending`/`rejected`/etc.) >
    `neutral` fallback. Uses the same warning/info/success color choices as
    `AlertBox` for visual consistency between the two.
  - `button-group/` — `ButtonGroup` (v0.5.0), a single-select segmented
    control (e.g. an ignore/create/update per-row choice) — built on
    `Button` rather than a bespoke element so segments get its variant/size/
    disabled/focus-visible styling for free. Selected segment uses
    `variant="default"`, the rest `variant="outline"`; segments are visually
    joined via `rounded-none` (first/last get `rounded-l-md`/`rounded-r-md`)
    and `-ml-px` overlap, with `hover:z-10`/`focus-visible:z-10` on each
    segment so its own border draws over the neighbor's instead of being
    clipped underneath it. Added for OneSales's contact-sync review UI,
    which previously used a plain `<select>` for this same three-way
    choice on desktop and had no mobile treatment at all — that plain
    `<select>` becomes a `ButtonGroup` on both.
  - `loading-spinner/` — `LoadingSpinner` (inline, `size` + optional
    `label`) and `LoadingOverlay` (centers a larger spinner in its
    container). Deliberately did **not** adopt the sales app's existing
    bespoke SVG loader kit (several named animation variants sized by raw
    pixels) — that's specific to that app and not what the
    contract-management app's `Loader2`-based ad hoc spinners (the thing
    actually being consolidated) look like.
  - `combobox/` — `Combobox`, a searchable single- or multi-select
    ("autocomplete box") discriminated on a `multiple` prop (omitted/`false`
    keeps the original `value: string | null` shape unchanged; `multiple:
    true` switches to `value: string[]`, added in v0.2.0 after the sales
    app's own `ComboBox` turned out to need multi-select): a `Button` trigger
    showing the current selection (or an "N selected" summary once 2+ are
    picked, in multi-select mode) opening a `Popover` with an `Input` search
    filter above a scrollable option list (arrow-key navigation + Enter to
    select, click-to-select — in multi-select mode, selecting toggles the
    option and keeps the popover open rather than closing it). Deliberately
    built on the existing `Popover`/`Input` primitives rather than pulling in
    `cmdk`/a `Command` component — mirrors `@bmsuisse/datagrid`'s `EnumFilter`
    (plain substring filter over a manually rendered list), consistent with
    the earlier decision to drop `cmdk` from `EnumFilter` itself (see that
    file's history) rather than introduce it here for a single component.
    Also takes an optional `"data-testid"` (v0.2.1, forwarded to the trigger
    button) — the component has no other way to expose a stable test hook
    since it renders no DOM elements a consumer controls directly. Every
    option row also carries `data-option-value` (the option's `value`,
    always present) and, when a `"data-testid"` was given, `data-testid`
    suffixed `-option` (v0.3.2) — matching the old per-app `ComboBox`
    convention (`${testId}-option` on each row) so E2E selectors like
    `[data-testid="x-option"][data-option-value="y"]` keep working after a
    migration to this component.
    Options can carry a `group` key (v0.3.0) to render under a bold header,
    with a tri-state "select all" checkbox in multi-select mode (unchecked/
    checked/indeterminate, reflecting how many of the group's members are
    selected — toggling it selects or clears the whole group). Options
    sharing a `group` must be contiguous in `options`; a `groupLabels` prop
    maps a group key to its display label. When the selection resolves to
    one or more fully-selected groups and nothing else, the trigger shows
    those groups' labels (comma-joined) instead of a bare count — driven by
    the sales app's sales-agent filter, which previously faked grouping with
    page-local sentinel option rows (see AGENTS.md's UI-hack rule).
- `packages/ui/demo/` — same pattern as `packages/datagrid/demo`: a Vite
  app aliasing `@bmsuisse/ui` straight to `src/index.ts`, using the same
  reference-app-derived Tailwind v4 tokens, for visual QA.
- Same conventions as `@bmsuisse/datagrid`: `packages/ui/src/index.ts` is the
  entire public surface, `tsup` build, `vitest` + Testing Library tests
  under `packages/ui/tests/` mirroring `src/`.

- `packages/datagrid/src/index.ts` is the package's entire public surface —
  if you add something new and need it usable from outside the package,
  export it there. Internal shadcn/ui primitives in
  `packages/datagrid/src/components/ui/` are deliberately **not** exported
  (implementation detail).
- `python/datagrid/bmsdna/datagrid/` is a PEP 420 implicit namespace package
  (no `bmsdna/__init__.py` at the root) — mirrors `bmsdna-devtools` in the
  `devtools` repo. Built with hatchling; see `python/datagrid/pyproject.toml`.

## The shared filter/sort contract — hand-mirrored, not codegen'd

`FilterDescriptor` / `CompositeFilterDescriptor` / `SortDescriptor` /
`GridState` exist twice, by hand, kept in sync manually:

- TypeScript: `packages/datagrid/src/filter/types.ts`
- Python: `python/datagrid/bmsdna/datagrid/filters.py` (pydantic, with
  camelCase aliases — `ignoreCase`/`pageSize` — via `populate_by_name` +
  `serialize_by_alias`, so JSON round-trips in either direction without a
  caller having to remember `by_alias=True`)

**There is no schema generator tying these together.** If you add an
operator to one side's `FilterOperator` literal, you must add it to the
other's, and to every place that dispatches on it: `evaluate.ts`'s switch,
`sql.py`'s `_build_leaf`, `meili.py`'s `_render_leaf`. Both `test_sql.py`
and `test_meili.py` contain a completeness test
(`test_every_operator_case_covers_the_full_filteroperator_contract` /
`test_every_filteroperator_is_handled`) that diffs its own test-case
operator set against `typing.get_args(FilterOperator)` — it will fail loudly
if you add an operator without adding a branch (and a test case) for it in
that file, but it does **not** protect the other two dispatch sites
(`evaluate.ts`, and whichever of `sql.py`/`meili.py` you didn't touch). Grep
for the operator name across all three files when adding one.

## Column type system — `ColumnDef<TRow>`

`packages/datagrid/src/column/types.ts` defines `ColumnDef<TRow>` as a
discriminated union on `type`:

```ts
type ColumnDef<TRow> =
  | (BaseColumn<TRow> & { type: "string" })
  | (BaseColumn<TRow> & { type: "number" | "currency"; currency?: string })
  | (BaseColumn<TRow> & { type: "date" | "datetime" })
  | (BaseColumn<TRow> & { type: "boolean" })
  | (BaseColumn<TRow> & { type: "enum"; options: { value: string; label: string }[] })
```

Every column gets a working default filter widget purely from `type` — you
never have to build one. The mapping lives in
`packages/datagrid/src/filter/registry.tsx`'s `renderDefaultFilterWidget`:

| `type` | default widget | default operator |
|---|---|---|
| `string` | `StringFilter` — text input + operator dropdown (contains/eq/startsWith/endsWith) | `contains` |
| `enum` | `EnumFilter` — Excel-style checkbox list in a popover, with a search box and a tri-state "Select all" | `in` |
| `boolean` | `BooleanFilter` — 3-way All/Yes/No select | `eq` |
| `number` / `currency` | `NumberRangeFilter` — min/max inputs | `between` (or `gte`/`lte` if only one bound is set) |
| `date` / `datetime` | `DateRangeFilter` — Today/Last 7 days/This month presets + Calendar | `between` |

**Before adding a new filter widget for a column, check this table first** —
if your column's `type` already has a widget, `<DataGrid>` wires it up for
free the moment you add the column; you only need a custom `cell` (value
renderer) or `renderFilter` (below) for something the `type` system doesn't
already cover.

### `renderFilter` + `filterDisplay` — a custom filter widget for one column

`BaseColumn.renderFilter?: (value, onChange, filter) => ReactNode` overrides
the type-based default above for a single column. It gets the same
`(value, onChange)` pair the default widget would, plus the grid's full
current `GridState.filter` (every column's combined filter) as a third
argument — needed by widgets like `NumberHistogramFilter` (below) whose data
requirements go beyond what the type-based dispatch can supply.

`BaseColumn.filterDisplay?: "popover" | "row"` controls where that widget (or
the default one) renders. `"popover"` (the default) is the header-icon +
popover every column gets automatically — fine for compact controls, too
narrow for a slider or histogram to be usable. `"row"` instead renders the
widget's content inline, in an additional filter row under the header. That
row is **entirely opt-in**: it only appears at all once at least one visible,
filterable column sets `filterDisplay: "row"`; columns that don't just get an
empty cell in it, and every other page's `<DataGrid>` keeps rendering with no
filter row whatsoever.

### `renderHeader` — a rich header for a single column

`BaseColumn.header` is a plain `string` — used for the filter icon's
`aria-label` and the `<ColumnSelector>` list, neither of which can work off a
`ReactNode`. `BaseColumn.renderHeader?: (column) => ReactNode` overrides just
the *rendering* of the header cell's content — what wraps it depends on
`sortable`:

- **`sortable: true`** — the sort caret renders alongside whatever this
  returns, and both end up nested inside a real `<button>` (the sort toggle).
  Avoid nesting another `<button>`/link/other focusable element in here: a
  button inside a button is invalid HTML, and a click on the inner element
  also bubbles up and fires the outer sort toggle — usually not what you want.
  Use a non-focusable wrapper (a `<span>`, not a `<TooltipTrigger>`'s default
  `<button>`) for tooltips/info icons:

  ```tsx
  {
    ...marginColumn,
    sortable: true,
    renderHeader: (column) => (
      <Tooltip>
        <TooltipTrigger render={<span />}>{column.header}</TooltipTrigger>
        <TooltipContent>...</TooltipContent>
      </Tooltip>
    ),
  }
  ```

- **`sortable` unset/`false`** (the default) — this renders directly in a
  plain, non-interactive `<div>`, no wrapping button at all, so nested
  interactive content (a bare filter input, an "approve/reject all" button)
  works normally. Before 0.24.1 this was *also* wrapped in a `<button
  disabled>` for consistency with the sortable case — a disabled button
  suppresses pointer events for its entire subtree in real browsers, so any
  interactive element a non-sortable column's `renderHeader` returned was
  silently unclickable (nothing looked wrong visually, and jsdom-based tests
  don't reproduce the browser's disabled-subtree pointer-event suppression,
  so this shipped unnoticed for a while). Prefer a column embedding its own
  interactive header widgets to stay `sortable: false`/unset now that this
  works — don't set `sortable: true` just to route around the old bug.

If what `renderHeader` returns has no visible text (an icon-only header), add
your own `aria-label` on it — `<DataGrid>` has no way to detect that its own
accessible name would otherwise be empty.

### `NumberHistogramFilter` + `facetedNumberValues` — richer numeric filtering

`NumberRangeFilter` (the `number`/`currency` default above) is plain min/max
inputs. `packages/datagrid/src/filter/NumberHistogramFilter.tsx` is a richer
alternative — a log-scale histogram behind a dual-thumb slider, plus min/max
text inputs — for when a column's numeric spread is worth showing visually
(e.g. price, revenue). It is **not** wired up as any column type's automatic
default (it needs data the type-based dispatch can't supply), so use it via
`renderFilter`:

```tsx
{
  ...priceColumn, filterable: true,
  renderFilter: (value, onChange, filter) => (
    <NumberHistogramFilter
      bare
      column={priceColumn}
      value={value}
      onChange={onChange}
      allValues={facetedNumberValues(allRows, priceColumn, filter)}
    />
  ),
}
```

Pass **`bare`** under the default `filterDisplay: "popover"` — `<DataGrid>`
already renders the header filter icon and popover around whatever
`renderFilter` returns, so without `bare` this component's own
Label+Popover+trigger-Button would nest a second popover inside the first,
costing an extra click (open the header's popover, *then* click this
component's own trigger) to reach the histogram at all. Omit `bare` (or set
it `false`) only under `filterDisplay: "row"`, which renders the widget
inline with no wrapping popover of its own — there, this component's
self-contained trigger+popover is what makes it clickable in the first
place.

`NumberHistogramFilter` takes its domain values one of two ways:

- **`allValues`** — a plain array, for `<DataGrid>` in `"client"` mode, where
  the full facet-safe row set is already in memory. Compute it via the
  paired helper `facetedNumberValues(data, column, filter)` from
  `packages/datagrid/src/filter/facetedValues.ts`.
- **`loadValues: () => Promise<(number | null | undefined)[]>`** — for
  `"server"` mode, where the rows the grid actually holds are just the
  current page, already narrowed by every active filter (including this
  column's own) — never safe to pass as `allValues` directly. `loadValues`
  is called fresh every time the popover opens (not cached across opens,
  since every *other* active filter it should itself respect may have
  changed since it was last open) and typically closes over your own "fetch
  facet values for this column, given every other active filter" endpoint.

**Why a column's own histogram can't just read values off the currently
displayed rows**: that's the exact bug `facetedNumberValues`/`loadValues`
exist to prevent (first hit on a consuming app's customer list numeric filters). If
a filter widget's own histogram/slider domain is computed from data already
narrowed *by that same filter*, the domain shrinks every time the user
adjusts the range — they can never widen it back out — and if one "all
values" computation is naively reused across multiple numeric columns,
filtering column A also warps column B's histogram. `facetedNumberValues`
does the standard "faceted search" fix instead: it takes the grid's full
`GridState.filter`, excludes just the leaf filter(s) on `column.id`, and
evaluates every *other* active filter — so a column's own histogram always
reflects "what could I select if I changed just this filter," and stays
affected by every other filter as expected. See
`packages/datagrid/demo/src/App.tsx`'s `FacetedNumberFilterDemo` for a full
working `<DataGrid>` example with two interacting numeric columns.

### `sortable` / `filterable` default to **false** — opt-in, not opt-out

```ts
{ id: "status", type: "enum", header: "Status", accessorKey: "status", options: [...] }
```

This column renders with **no** sort toggle and **no** filter icon in its
header, even though `EnumFilter` exists and would work fine — you must set
both explicitly:

```ts
{
  id: "status", type: "enum", header: "Status", accessorKey: "status",
  sortable: true, filterable: true,
  options: [{ value: "pending", label: "Pending" }, /* ... */],
}
```

This is the opposite of what you'd guess from "every type has a working
default widget" — that only means a widget *exists*; whether it *renders* is
gated by these two flags, and the gate defaults shut. Forgetting them is the
most likely mistake an agent adding a column will make. See
`packages/datagrid/demo/src/App.tsx` for a real example with several columns
all setting both explicitly.

### `sortDescFirst` — for a column whose "interesting" direction is descending

A sortable column's first click sorts ascending by default (`sortable`'s own
opt-in above doesn't change this) — fine for a name or category column, but
wrong for revenue, a risk score, or a backlog amount, where a user clicking
the header wants the highest/most-urgent values first, not the lowest ones
buried at the top. Set `sortDescFirst: true` on that column and the cycle
becomes desc → asc → none instead of asc → desc → none:

```ts
{ id: "revenue", type: "currency", header: "Revenue", accessorKey: "revenue", sortable: true, sortDescFirst: true }
```

### `group` — for `<ColumnSelector>`, not for `<DataGrid>` itself

`BaseColumn.group?: string` only matters to `<ColumnSelector>` (below); it
has no effect on `<DataGrid>`'s own rendering. Columns sharing the same
`group` string are shown together under that label in the selector;
omitting `group` puts the column in an unlabeled section listed first.

Avoid picking a `group` name that's identical to one of its own columns'
`header` — the selector renders the group label immediately above that
group's column rows, so a group named e.g. `"Order"` containing a column
whose `header` is also `"Order"` renders as two adjacent "Order" lines that
read as a duplicate. Caught twice in `packages/datagrid/demo/src/App.tsx`
during visual QA/test-writing — the `id` column's header is `"Order"`, so
its group is named `"Details"` instead, and the `customer_name` column's
header is `"Customer"`, so *its* (single-column) group is named `"Account"`
instead.

### `headerGroup` — spanning header cells over contiguous columns

`BaseColumn.headerGroup?: string` is a *different* field from `group` above,
and does change `<DataGrid>`'s own rendering: contiguous **visible** columns
sharing the same `headerGroup` string are merged under one `colSpan`'d label
cell in an extra row above the normal per-column header row (e.g. several
per-campaign sub-columns under one "Summer Sale" header). A column with no
`headerGroup` still needs to render *something* in that row — rather than a
blank cell, it spans both header rows itself via `rowSpan`, so an ungrouped
column still reads as one column, not a column with an empty strip above it.

Grouping is purely positional: two columns sharing the same `headerGroup`
label that AREN'T adjacent in the visible column order (some other column,
grouped or not, sits between them) produce two separate spanning cells with
the same label, not one merged cell — matches how the columns actually read
left-to-right, and avoids `<DataGrid>` silently reordering anything to make
non-adjacent same-label columns contiguous. Sort/filter/resize/pin all keep
working exactly as they do on any other column — `headerGroup` only changes
which row a column's header cell renders in, never which column it is.
`<DataGrid>` itself has no grouped/nested `ColumnDef` (unlike TanStack
Table's own `columns: [...]` nesting) — this is the one way to get a
spanning header, and it's rendering-only, not a real column hierarchy.

### `pinned` — sticky left/right columns

`BaseColumn.pinned?: "left" | "right"` sticks a column to the left or right
edge of `<DataGrid>`'s own scroll container (the table is wrapped in an
`overflow-x-auto` div specifically so this has somewhere to stick within,
instead of the whole page scrolling). Offsets stack: the Nth `pinned: "left"`
column (in column order) sits at the sum of every earlier left-pinned
column's `width`; `pinned: "right"` stacks the same way from the right, in
reverse column order. **Give a pinned column an explicit `width`** — without
one, offset math falls back to a fixed 150px per column, which usually
doesn't match its actual rendered width and throws off stacking for anything
pinned after it. The built-in expand/selection/row-actions columns always
render pinned to their edge regardless of any `pinned` you set on a data
column — a pinned data column's own offset math already reserves space for
whichever of those render before it (`leadingOffset`/`trailingOffset` in
`DataGrid.tsx`'s `pinnedOffsets`), so it lines up flush against them rather
than sticking at the very edge and scrolling over them. You still can't pin
a structural column itself to the opposite edge or interleave a pinned data
column between them — they're fixed to the outer edges. See
`packages/datagrid/demo/src/App.tsx`'s `PinnedColumnsDemo` for a working
example with one column pinned each side. Combines with `enableColumnResizing`
below — a pinned column's offset always tracks its *live* width (resized or
not), not just its declared `width`.

### `enableColumnResizing` — manual column resize

`DataGridProps.enableColumnResizing?: boolean` (default `false`) adds a drag
handle to every column's trailing header edge, backed by TanStack Table's own
`columnSizingFeature`/`columnResizingFeature` (both registered unconditionally
at module scope — harmless when unused, since `enableColumnResizing` is what
actually gates the handle and the resize interaction, not feature
registration). `columnResizeMode` (default `"onChange"`) controls whether a
column's width commits live while dragging or only once on release
(`"onEnd"`).

**Turning this on changes every column's sizing, not just resizable ones**:
once `enableColumnResizing` is true, every column gets a concrete pixel width
via `column.width` (or TanStack's own 150px default for a column that
doesn't set one) — trading "natural, content-driven column widths" for
"every column resizable." Leave it off (the default) for a grid that doesn't
need it.

Uncontrolled by default (`<DataGrid>` manages resize state internally); pass
`columnSizing`/`onColumnSizingChange` together (same convention as
`columnVisibility`) to persist/restore widths yourself, e.g. to `localStorage`
the same way `<ColumnSelector persistKey>` does for visibility.

## `<ColumnSelector>` — column visibility, grouping, persistence

`packages/datagrid/src/column-selector/ColumnSelector.tsx` is a **controlled**
component (same pattern as the filter widgets: `visibility`/
`onVisibilityChange`, not internal state) rendered as a shadcn `Dialog`. It
is **not** rendered inside `<DataGrid>` automatically — wire it up yourself,
driven by the same state you pass to `<DataGrid>`:

```tsx
const [visibility, setVisibility] = useState<ColumnVisibility>({});

<ColumnSelector
  columns={columns}
  visibility={visibility}
  onVisibilityChange={setVisibility}
  persistKey="orders"   // optional — omit for no localStorage interaction at all
/>
<DataGrid
  columns={columns}
  columnVisibility={visibility}
  onColumnVisibilityChange={setVisibility}
  /* ...dataSource, getRowId, etc. */
/>
```

Notes for extending it:
- `ColumnVisibility` is `Record<string, boolean>` with a **missing key
  meaning visible** (matches TanStack's own `VisibilityState` convention,
  intentionally, so it can be handed straight to a raw TanStack table if a
  caller ever needs to).
- Groups lay out **left-to-right as side-by-side columns** inside the
  dialog (the ungrouped section, unlabeled, is always first), wrapping onto
  a new row rather than growing the dialog past `sm:max-w-2xl` — it stays a
  simple modal, not a sprawling panel, even with several groups.
- A named group's header is a **plain muted label** — no checkbox, no
  "All"/"None" links, no bulk-select affordance of any kind. Two earlier
  versions tried a tri-state checkbox directly in the header, then an
  "All"/"None" text-link pair next to the label; both were dropped at the
  user's request after seeing a screenshot ("pretty ugly," then "remove the
  links entirely, group headers should be plain labels only"). Toggling a
  whole group at once is no longer possible from the selector — only
  per-column checkboxes remain.
- It will not let the user hide the *last* visible column (see
  `canHideColumn` in `column-selector/visibility.ts`) — the per-column
  `Checkbox` disables itself rather than firing a change that would leave
  zero columns visible. `canHideGroup` (same file) still exists and is
  still exported/tested, but nothing in `ColumnSelector.tsx` itself calls it
  anymore now that there's no group-level action to guard.
- `persistKey`, if set, reads `localStorage["bmsui-datagrid:columns:" +
  persistKey]` once on mount (calling `onVisibilityChange` once, merged over
  whatever `visibility` was passed in) and writes on every subsequent
  user-driven change. Malformed/stale stored JSON is caught and ignored
  (falls back to the current `visibility` prop), never thrown.
- `<DataGrid>` only **reads** `columnVisibility` (filters which columns
  render); it never writes it. `onColumnVisibilityChange` exists on
  `DataGridProps` for API symmetry with `<ColumnSelector>`'s props, but
  `<DataGrid>` itself never calls it — the selector is what drives changes.

## `<DataGrid>` — one component, two `DataSource` modes

`<DataGrid>` is TanStack Table v9 under the hood (migrated natively, not via
the deprecated `useLegacyTable` shim), but only uses its automatic core row
model — `DataGrid.tsx` registers an empty `tableFeatures({})` and builds
`getRowId`/header groups/cells from that alone, because `useGridState`
(below) and `processClientData.ts` already own all sorting/filtering/
pagination in both client and server modes; TanStack's sorted/filtered/
paginated row models are never registered. This is invisible to callers with
one exception: `DataGrid<TRow>`'s generic now requires `TRow extends
Record<string, any> | Array<any>` (TanStack v9's tightened `RowData`
constraint), needed to pass `TRow` through to TanStack's own generics
inside the component. In practice this never bites — any plain row object
type used with a grid already satisfies it — but it is a (harmless) change
to the public type signature versus v8's fully-unconstrained `TRow`.

```ts
type DataSource<TRow> =
  | { mode: "client"; data: TRow[] }
  | { mode: "server"; data: TRow[]; rowCount: number; loading?: boolean; onStateChange: (state: GridState) => void }
```

- **`"client"`**: hand it the full array. `<DataGrid>` filters (via
  `evaluateFilter`), multi-column sorts, and paginates in-memory itself —
  see `packages/datagrid/src/grid/processClientData.ts`. You do nothing
  else.
- **`"server"`**: `data` must already be exactly the current page,
  pre-filtered and pre-sorted by you. `<DataGrid>` calls `onStateChange`
  whenever sort/filter/page changes — **debounced ~300ms for filter
  changes** (typing), **immediately** for sort/page changes — and then just
  renders whatever `data`/`rowCount` you hand back on the next render. It
  **never** re-filters or re-sorts server-mode data itself; if your
  `onStateChange` handler doesn't actually apply the new `GridState` and
  refetch, nothing will change on screen. `e2e/server/main.py` +
  `packages/datagrid/demo/src/App.tsx` is a complete worked example of the
  server-mode contract end to end (fetch on every `GridState` change, feed
  `rows`/`rowCount`/`loading` back in).

By default `<DataGrid>` fully owns its `GridState` after mount — `initialState`
only seeds it once. To push a *new* state in from outside afterward
(restoring a saved filter, a "clear all filters" button, syncing from a URL
that changed) without remounting `<DataGrid>` (e.g. via a changing `key`),
pass `gridState`: whenever it changes identity, internal state is overwritten
to match. In server mode this is naturally symmetric with `onStateChange` —
mirror every `onStateChange` call into your own state, and pass that same
state back in as `gridState`, giving you a fully two-way-controlled grid.
Pushing a new `gridState` also cancels any pending ~300ms-debounced filter
notify, so a filter edit made just before the push can't have its own stale
notify fire afterward and resurrect what the push just overwrote (the same
protection sort/page changes already had against each other — this closes
the gap for `gridState` too).

Two footguns: pass the *same* state value you're tracking, not a fresh
object literal recreated every render (that re-triggers the resync every
render); and — like a controlled `<input>` — decide once whether a given
`<DataGrid>` is `gridState`-controlled or not and stay there for its whole
lifetime. Toggling `gridState` to `undefined` later doesn't hand control
back, it just stops resyncing.

`evaluateFilter` (client mode's engine) is meant to have **identical**
operator semantics to `sql.py`/`meili.py` (server mode's usual engines) —
same inclusive-`between`, same case-sensitivity default, same null handling
— so that switching a grid from `"client"` to `"server"` (or vice versa)
never changes which rows a given `GridState` matches. `evaluate.ts`'s own
module docstring spells out the exact semantics; `sql.py`/`meili.py`'s test
files were written to mirror the same case list. If you change one, check
the others.

### `renderDetail` — expand a row to show more, without `<TreeDataGrid>`

`DataGridProps.renderDetail?: (row: TRow) => ReactNode` adds an expand/
collapse chevron in a dedicated leftmost column; expanding a row renders
`renderDetail(row)`'s result directly below it, in its own full-width `<tr>`.
Omitting the prop disables the feature entirely — no chevron column renders
at all, matching `rowActions`/`headerActions`'s own all-or-nothing opt-in
style. Multiple rows can be expanded at once; there's no single-row
constraint.

This is for a flat row's own extra detail (a KPI panel, line items, an
inline mini-form) — not for hierarchical parent/child data, which is what
`<TreeDataGrid>` (below) is for instead. Ported from (a much simplified
version of) a hand-rolled pattern already used for a consuming app's customer list page:
that version re-measures row heights and auto-scrolls on every expand/
collapse (needed because it's virtualized — see `virtualize` next — and only
allows one row expanded at a time. `<DataGrid>`'s own version needs none of
that bookkeeping outside a virtualized grid; combined with `virtualize`, only
the row's own height is dynamically re-measured, not the expanded detail
panel's (see `virtualize`'s own doc for the exact tradeoff).

```tsx
<DataGrid
  columns={columns}
  dataSource={dataSource}
  getRowId={(row) => row.id}
  renderDetail={(row) => <OrderLineItems orderId={row.id} />}
/>
```

### `getRowProps` — a whole-row click target, or a caller's own `data-*`

`DataGridProps.getRowProps?: (row: TRow) => Record<string, unknown>` spreads
whatever it returns onto that row's own `<tr>` — `onClick` (making the whole
row a click target, e.g. row-click-to-navigate; `rowActions` is a kebab
menu, not this), `className`, or a caller-specific `data-testid`/`data-*` an
existing test suite already depends on. Applied *after* `<DataGrid>`'s own
`data-testid`/`data-index`/`ref`, so those always survive even if this
returns colliding keys.

```tsx
<DataGrid
  columns={columns}
  dataSource={dataSource}
  getRowId={(row) => row.id}
  getRowProps={(row) => ({
    onClick: () => navigate(`/orders/${row.id}`),
    className: "cursor-pointer",
    "data-order-status": row.status,
  })}
/>
```

### `selectedIds` — controlled row selection

By default `<DataGrid>` owns selection internally, exposed only via
`headerActions`' `ctx.selectedRows` closure — fine for a "Bulk actions" menu
rendered inside the grid itself, useless for a caller that wants to build
its *own* toolbar elsewhere on the page (a bulk-export button, a "N
selected" count next to a search box). Pass `selectedIds`/
`onSelectedIdsChange` together to take over: `<DataGrid>` reads selection
from the prop instead of its own state, and calls `onSelectedIdsChange`
instead of updating internally.

```tsx
const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

<span>{selectedIds.size} selected</span>
<button onClick={() => exportRows([...selectedIds])}>Export</button>
<DataGrid
  columns={columns}
  dataSource={dataSource}
  getRowId={(row) => row.id}
  selectedIds={selectedIds}
  onSelectedIdsChange={setSelectedIds}
/>
```

The checkbox column itself renders whenever `selectedIds` is controlled —
unlike the default (internal-state) case, it does **not** need
`headerActions` too. `headerActions`' own "{N} selected" + bulk-actions bar
stays gated on `headerActions` specifically, so a controlled-selection
caller building its own toolbar (like the example above) doesn't get a
second, redundant one from `<DataGrid>` itself.

### `virtualize` — row virtualization + infinite scroll

`DataGridProps.virtualize?: DataGridVirtualizeOptions` turns on
`@tanstack/react-virtual` windowing once the row count crosses `threshold`
(default 100) — the same padding-row technique `<TreeDataGrid>` already uses
(a scroll container with `overflow-y-auto`/`maxHeight`, spacer `<tr>`s before
and after the rendered window). Omit it entirely for a plain, fully-rendered
`<table>` — most grids never need this.

```tsx
<DataGrid
  columns={columns}
  dataSource={{ mode: "server", data: items, rowCount, onStateChange }}
  getRowId={(row) => row.id}
  virtualize={{
    maxBodyHeight: 480,
    onEndReached: () => fetchNextPage(),
    hasMore: hasNextPage,
  }}
/>
```

- **`onEndReached`** is the infinite-scroll hook: it fires once when scrolling
  reaches the last currently-loaded row (not repeatedly, and not again for
  the same `data` length — only once `data` actually grows does another
  scroll-to-end re-fire it). `<DataGrid>` doesn't own pagination state in
  this mode — fetch more and grow `dataSource.data` yourself, exactly the
  pattern (`fetchNextPage`/`hasNextPage` from an infinite/paged query) in
  consuming apps this was built to replace. Works with both
  `"client"` and `"server"` `DataSource`, since it's purely about
  *rendering*, not fetching — though **prefer `"server"` mode for an
  infinite-scroll grid**: `"client"` mode still paginates via
  `GridState.pageSize`, capping what actually renders to one page regardless
  of how many rows `data` holds.
- **The Previous/Next pagination footer still renders** even with
  `virtualize` on — infinite-scroll and page-based navigation are competing
  UX patterns, and `<DataGrid>` doesn't hide one for the other. For a purely
  infinite-scroll grid, expect it to sit there decoratively (or simply never
  call `setPage`/pass a paging UI of your own), or set `showPagination: false`
  to drop the built-in footer entirely and render your own pagination UI
  instead (e.g. one with specific `data-testid`s an existing test suite
  already depends on).
- **Combined with `renderDetail`**: each row (and its detail panel, when
  expanded) gets its own `<tbody>` — a `<table>` can hold more than one, and
  a `<tbody>`'s own bounding rect already reflects the combined height of
  every `<tr>` inside it. `virtualizer.measureElement` is attached to that
  `<tbody>`, not the row's own `<tr>`, so expanding/collapsing a row is
  measured correctly (unlike `<TreeDataGrid>`, which has no detail panels
  and still measures its own `<tr>` directly).
- The demo (`packages/datagrid/demo/src/App.tsx`'s `VirtualizedScrollDemo`)
  only exercises plain virtualization now — a fixed 5,000-row "server"-mode
  dataset, no `onEndReached` — after a screenshot review found the earlier
  incremental-load demo confusing (its Previous/Next footer looked
  interactive but its `onStateChange` was a no-op). For a worked
  `onEndReached` example, see `DataGrid.test.tsx`'s "calls onEndReached once
  scrolling reaches the last currently-loaded row" test instead.

### `groupBy` — single-level row grouping

`DataGridProps.groupBy?: (row: TRow) => string` buckets the grid's
already-filtered/sorted/paginated `rows` into groups, rendering one
full-width, `colSpan`'d, collapsible group-header row before each bucket's
own rows — in first-seen bucket order, never re-sorted (the caller's own
sort already determines which key appears first). Single level only: no
nested grouping, no built-in aggregate/summary calculation — a caller
wanting a subtotal computes it themselves in `renderGroupHeader` off that
bucket's own row array.

```tsx
<DataGrid
  columns={columns}
  dataSource={{ mode: "client", data: approvals }}
  getRowId={(row) => row.id}
  groupBy={(row) => row.customerName}
  renderGroupHeader={(key, rows) => `${key} (${rows.length} pending)`}
/>
```

`renderGroupHeader` defaults to `` `${key} (${rows.length})` `` when
omitted. `defaultGroupsExpanded` (default `true`) sets a newly-seen group's
initial state; pass `expandedGroups`/`onExpandedGroupsChange` together
(same controlled/uncontrolled convention as `columnSizing`) to persist or
drive collapse state yourself.

Operates on whatever `rows` already resolved to — i.e. the current page, if
paginated — with no special-casing to keep one group's full membership
together across pages; pair with a large `pageSize`/`showPagination: false`
if that matters for a given grid.

**Not supported together with `virtualize` yet.** Interleaving synthetic
group-header rows and hiding a collapsed bucket's rows needs a flattened
index space to virtualize correctly (the same technique `<TreeDataGrid>`
uses for its own flattened tree) — out of scope for this pass. Setting both
`groupBy` and `virtualize` silently disables virtualization rather than
mis-rendering; see "Known limitations" below.

## `<TreeDataGrid>` — lazy-loading tree grid

Generalizes a consuming app's contract tree list component (1343 lines,
entirely bespoke, no shared abstraction) into a reusable component in
`packages/datagrid/src/tree/`, reusing the same `ColumnDef<TRow>` system
`<DataGrid>` uses rather than a
second column-definition system. **Deliberately has no sorting or
client-side filtering** — neither does `ContractTreelist`; hierarchy order
comes from the backend, and "filtering" there means asking the server for a
differently-shaped tree, which is app-level, not something this component
generalizes.

- **Accessor-based node shape**, not a required field shape on `TRow`
  (matches `<DataGrid>`'s `getRowId` convention): `getRowId`, `getChildren`
  (already-loaded children, if any), and an optional `hasChildren` — kept
  independent of `getChildren` on purpose, mirroring `ContractTreeModel`'s
  `has_children: boolean` being distinct from its optional `children` array.
  A node can know it has children the backend hasn't sent yet. Omit
  `hasChildren` only for a fully eager tree (it then defaults to
  `getChildren(row)?.length > 0`); a lazy tree **must** supply it explicitly,
  since a not-yet-fetched node has no `children` to measure.
- **`onLoadChildren`** is the only thing that makes a node lazy. Omit it
  entirely for a fully eager tree. Results are cached per node id for the
  component's lifetime in `useTreeState` — collapsing and re-expanding never
  refetches. Unlike `ContractTreelist`'s `toggleExpand` (no `.catch` around
  its `fetchChildrenFor` call — a failure there is an unhandled rejection
  with zero visible error), a failed `onLoadChildren` call here surfaces via
  `errorIds` and renders inline on the parent row itself: "Failed to load. Retry"
  — no synthetic extra row, so the flattened row count (and the virtualizer's
  count) never has to account for error state.
- **No implicit reset on `data` changes.** `useTreeState` does not clear
  `expanded`/the children cache when `data`'s identity changes — unlike
  `ContractTreelist`, which resets both on every filter change because
  filtering there reshapes the whole tree server-side. A caller that wants a
  full reset (switching to a genuinely different root entity) should remount
  `<TreeDataGrid>` via a `key` prop.
- **The tree column** (indentation + expand/collapse chevron) is whichever
  column's `id` matches `treeColumnId` (defaults to `columns[0]`) — every
  other column renders exactly like it would in `<DataGrid>`, via the same
  `column.cell` / `defaultFormat` dispatch.
- **Virtualization** via `@tanstack/react-virtual`, using the classic
  "padding-row" technique (two spacer `<tr>`s sized from
  `virtualItem.start`/`getTotalSize()`, real rows in between) since you can't
  `position: absolute` a `<tr>` — this is the same technique
  `ContractTreelist` itself uses. Only engages once the *flattened* (visible)
  row count exceeds `virtualizeThreshold` (default 100); smaller trees render
  every row directly with no virtualizer overhead. `estimatedRowHeight`
  (default 40) is only the virtualizer's *initial* guess before layout —
  `virtualizer.measureElement` is attached directly to each row's own `<tr>`
  (there's no detail panel to also measure, unlike `<DataGrid>`'s own
  `<tbody>`-level attachment above), so actual per-row DOM height — e.g. a
  multi-line label — is measured and corrected for after the fact, not just
  estimated. `maxBodyHeight` (default 480, becomes the scrollable
  container's `max-height`) tunes the viewport.
- **`rowActions`** reuses the exact `MenuItem<TRow>`/`ActionsMenu` contract
  `<DataGrid>`'s `rowActions` prop uses — a deliberate improvement over
  `ContractTreelist`'s always-visible bespoke icon buttons, for consistency
  between the two grids' per-row action UIs.
- **Not carried over from `ContractTreelist`, on purpose, as out of scope for
  a generic component**: inline cell editing (`edited_rebate`'s
  `RebateInputGraduate` + debounced autosave) and server-driven filtering —
  business-logic-specific to that one screen, not generalizable patterns. A
  consumer that needs inline editing should build it via a custom
  `column.cell` renderer + its own state, the same way it would for
  `<DataGrid>`. Row selection now has a minimal, generic primitive (below) —
  but any *cascade* semantics (selecting a parent selects/deselects its
  descendants, "whole group vs. split into individual children once
  loaded") stays entirely the caller's job, the same way it would for
  `<DataGrid>`.
- See `packages/datagrid/demo/src/App.tsx`'s `<OrgTreeDemo>` for a complete
  worked example: a 3-level lazy org chart with a `setTimeout`-simulated API
  and one node whose first load intentionally fails, to exercise the
  error+retry UX.

### `selectedIds` — controlled row selection (tri-state)

Same controlled-only convention as `<DataGrid>`'s own `selectedIds`/
`onSelectedIdsChange`, except there's no internal/uncontrolled fallback —
`<TreeDataGrid>` has no `headerActions` bulk-toolbar concept that would need
selection state even without external control, so both props must be
supplied together for the checkbox column to render at all.

```tsx
<TreeDataGrid
  columns={columns}
  data={data}
  getRowId={(row) => row.id}
  getChildren={(row) => row.children}
  selectedIds={selectedIds}
  onSelectedIdsChange={setSelectedIds}
/>
```

Clicking a row's checkbox always toggles exactly that row's own id in
`selectedIds` — never its children or parent; any cascade is the caller's
job, recomputing the desired final set inside `onSelectedIdsChange` before
committing it. A "select all visible rows" checkbox renders in the header,
scoped to the currently flattened/visible rows (mirroring `<DataGrid>`'s own
"select all on this page").

**`checked` is always exactly `selectedIds.has(getRowId(row))`** — nothing
in the component can make a row render checked without its id literally
being a member of `selectedIds`. **`indeterminate` is auto-derived** as a
convenience: true when a row itself isn't checked but at least one
*currently loaded* descendant (via the same `getChildren`/`onLoadChildren`
cache the tree already maintains) is checked or itself indeterminate — a
pure display fact, computed once per render over the whole loaded tree
(`packages/datagrid/src/tree/selectionState.ts`'s `computeSelectionStates`),
not per visible row. A selected descendant hidden behind a node that's
never been expanded (so its children were never fetched) can't be
inspected — that ancestor reads unchecked, not indeterminate, until the
fetch happens.

`getRowSelectionState?: (row) => {checked, indeterminate?} | undefined` is
a full override escape hatch for selection semantics this component won't
build in — e.g. `PrintDiscountGroupSelectionTab`'s "select whole group vs.
split into individual children once loaded" cascade, where a parent should
read as checked even though not every descendant id is literally in
`selectedIds`. Return `undefined` for a given row to fall back to the
default derivation just for that row. `isRowSelectionDisabled?: (row) =>
boolean` disables just one row's checkbox.

## `sql.py` vs `meili.py` — one engine per query, never mixed

Both live in `python/datagrid/bmsdna/datagrid/`, both take the same
`FilterDescriptor`/`CompositeFilterDescriptor`/`SortDescriptor` input, and a
single query goes through **exactly one** of them — there's no code path
that combines a SQL query with a Meilisearch filter or vice versa.

- `sql.py`: `build_select`/`build_count`, built on `sqlglot` (dialect-aware:
  `"postgres"`/`"sqlite"`). Values are always bound via `sqlglot.exp.Placeholder`
  + a returned `params` dict — never string-interpolated.
- `meili.py`: `build_filter_expr`/`build_sort`/`build_search_params`, hand-
  rendering Meilisearch's filter-string DSL (no AST library backs it the way
  sqlglot backs `sql.py`).

**`meili.py` deliberately raises `UnsupportedOperatorError` for
`contains`/`doesNotContain`/`startsWith`/`endsWith`, and for `ignoreCase`
combined with `eq`/`neq`/`in`/`notIn`** — Meilisearch's filter DSL has no
substring/prefix/suffix operator and no case-insensitive comparison
operator. **If you hit this error, that is the correct behavior, not a bug
to patch around.** Route substring/prefix/suffix matching through
Meilisearch's own full-text search (the `q` argument to `index.search`)
instead of trying to approximate it as a filter. A sibling repo once mapped
`endsWith` onto Meilisearch's `CONTAINS` operator — a different, incorrect
match — specifically to avoid repeating that, `meili.py` raises instead of
guessing. `e2e/server/main.py`'s `/api/meili/{entity}/query` route catches
`UnsupportedOperatorError` and returns a 422 with the real reason, rather
than a bare 500 — copy that pattern in any other backend that calls
`meili.py`.

## Running the e2e harness locally

```bash
# 1. One-time (or whenever you want a fresh binary): idempotent, safe to rerun.
./e2e/server/scripts/setup-meilisearch.sh

# 2. Start Meilisearch (dev-only fixed key, matches load_fixtures_meili.py's default
#    and playwright.config.ts's webServer entry):
./e2e/server/bin/meilisearch --db-path "$(mktemp -d)" --http-addr 127.0.0.1:7700 \
  --master-key bmsui-datagrid-dev-master-key --no-analytics

# 3. Start the FastAPI app (loads SQLite fixtures + connects to Meilisearch with retry):
cd e2e/server && uv run uvicorn main:app --port 8000

# 4. Start the demo (proxies /api to :8000):
cd packages/datagrid/demo && bun run dev

# 5. Run the Playwright suite (drives its own webServers per the above — you
#    don't need steps 1-4 running separately unless you want to poke at them
#    directly, e.g. via curl):
cd packages/datagrid && bun run e2e
```

`POST /api/sql/{entity}/query` and `POST /api/meili/{entity}/query` (entity
is `orders` or `customers`) both take the same body — a `GridState` as JSON
— and return `{"rows": [...], "rowCount": N}`. `GET /health` reports
`{"status": "ok", "meilisearch": true|false}` — `meilisearch: false` means
the retry-connect loop in `main.py`'s lifespan never found it reachable, and
`/api/meili/*` will 501.

## Known limitations (accurate as of this writing)

- **No built-in widget produces a `field: string[]` (pre-qualified join
  path) filter.** The contract supports it end to end (`sql.py`/`meili.py`
  render `["c", "customer_name"]` as `c.customer_name` correctly, and
  `evaluateFilter` resolves it as nested property access), but every
  built-in filter widget always emits `field: column.id` — a plain string.
  If you need a filter against a pre-qualified/joined column, you'll build
  that FilterDescriptor by hand (e.g. in a server-mode `onStateChange`
  handler) rather than getting it from a column's default widget.
- **`GridState.filter` only ever gets built as a flat `{logic: "and"}` of
  per-column leaves by the built-in filter widgets.** The type supports
  arbitrary AND/OR nesting (for custom filter UIs, or server-side
  consumers), but if you pass `initialState.filter` with `logic: "or"` (or
  any deeper nesting) into `<DataGrid>`, the very next edit through a
  built-in filter widget flattens it back to `{logic: "and", filters:
  [...]}`, silently discarding that structure. Supporting arbitrary boolean
  composition in the built-in widgets would need a fundamentally different
  UI (a query builder) — out of scope here. See `useGridState.ts`'s comment
  on `setColumnFilter` for the full reasoning.
- **`BooleanFilter` only round-trips `eq`/`neq` FilterDescriptors into its
  3-way All/Yes/No display.** A restored/foreign filter using
  `isNull`/`isNotNull`/`in`/`notIn` on a boolean column displays as "All"
  (no visible filter) even if one is technically active — those operators
  don't map onto a 3-state UI unambiguously. This widget only ever emits
  `eq` itself, so this only matters for state that arrived from elsewhere
  (a URL, a saved view, a hand-built request).
- **`useGridState` enforces no `sortable`/`filterable` policy itself** —
  only `<DataGrid>`'s rendered header does (gating the sort button and
  whether a filter icon renders at all). A caller that imports
  `useGridState` directly, bypassing `<DataGrid>`'s markup entirely, is
  responsible for applying that same policy itself before calling
  `toggleSort`/`setColumnFilter`.
- **Meilisearch's `ignoreCase` and SQLite's `LIKE` case-sensitivity are
  connection/engine quirks, not fully solved by this package alone.**
  `sql.py` documents (and `e2e/server/main.py` demonstrates) that SQLite's
  `LIKE` is case-insensitive for ASCII by default regardless of what SQL
  gets generated — a caller targeting SQLite needs `PRAGMA
  case_sensitive_like = ON` on their own connection. Meilisearch has no
  case-insensitive filter operator at all, so `ignoreCase` + `eq`/`neq`/
  `in`/`notIn` against that engine raises `UnsupportedOperatorError` rather
  than silently mismatching client-mode behavior.
- **The demo app (`packages/datagrid/demo`) is intentionally minimal** — no
  routing library, no polish, just enough UI to drive the Playwright suite
  and let a human look at it. Don't take its patterns (inline `fetch` in a
  `useEffect`, no TanStack Query) as the recommended way to wire
  `"server"` mode in a real app; see the `tanstack-best-practices` skill
  for that.
- **`DataGridProps.groupBy` doesn't combine with `virtualize` yet.** Setting
  both silently forces virtualization off (the grid still groups correctly,
  just renders every row rather than windowing) rather than mis-rendering —
  true support needs a flattened index space for the virtualizer, the same
  technique `<TreeDataGrid>` uses for its own flattened tree, which is out
  of scope for now.
