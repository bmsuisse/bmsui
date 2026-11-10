---
title: Patterns
---

# Patterns

Higher-level components composed on top of the [primitives](/ui/primitives),
each addressing one specific shape that turned up duplicated across several
internal apps.

### `Modal` / `ConfirmDialog` / `FormModal`

A base header/body/footer wrapper (`Modal`), plus two specializations:
`ConfirmDialog` auto-closes on a successful confirm and stays open (logging
the failure) if the confirm action rejects; `FormModal` wraps a `<form>` and
deliberately does **not** auto-close after submit — that decision is left to
the caller, unlike `ConfirmDialog`.

### `ResponsivePanel`

Like `Modal`, but sized wider on desktop and rendered as a native
bottom-sheet drawer below `breakpoint` (default `lg`) instead of a small
centered dialog — for content that benefits from more room (multi-section
forms, longer lists) on both form factors.

```tsx
<ResponsivePanel
  open={open}
  onOpenChange={setOpen}
  title="Edit customer"
  size="lg"
  resizable
  draggable
  footer={<Button onClick={() => setOpen(false)}>Done</Button>}
>
  ...
</ResponsivePanel>
```

- `size` (`sm`/`md`/`lg` default/`xl`) controls the dialog width on desktop
  and the drawer's max height on mobile (width there is always full-bleed).
- `resizable` adds a drag grip on all four corners on desktop (each anchors
  the opposite corner) and a drag handle on the mobile drawer (height
  30vh–95vh); `size` then just becomes the starting size.
- `draggable` lets the user reposition the whole panel on desktop by
  dragging its header. Both `resizable` and `draggable` clamp to a viewport
  margin, so the panel can never be dragged (partly) off-screen.
- `closeOnOutsideClick` (default `true`) — set `false` to require the
  header's close button or Esc, for panels guarding unsaved work.

Footer buttons default to right-aligned (fine for a single action, or an
adjacent Cancel + Submit pair). For a split pair like Previous/Next — one
pinned left, the other right — wrap both in one full-width flex child:

```tsx
footer={
  <div className="flex w-full justify-between">
    <Button variant="outline" onClick={goBack}>Previous</Button>
    <Button onClick={goNext}>Next</Button>
  </div>
}
```

### `FormField`

The "label + input + error/description" wrapper. Auto-generates an `id` via
`useId()` unless the child already has one, and wires `aria-invalid`/
`aria-describedby` onto the single child automatically.

```tsx
<FormField label="Name" error={errors.name}>
  <Input value={name} onChange={(e) => setName(e.target.value)} />
</FormField>
```

### `AlertBox`

An error/warning/info/success banner. `error` uses the shared `destructive`
theme token; `warning`/`info`/`success` use fixed Tailwind palette colors
(amber/sky/emerald), since the base shadcn/ui theme has no tokens for those.

### `StatusBadge`

Maps a status string to a colored `Badge`. Resolves a tone in this order:
an explicit `tone` prop → your own `toneMap` → a small built-in English
status vocabulary (`approved`/`pending`/`rejected`/etc.) → a neutral
fallback.

### `EmptyState` / `FilteredEmptyState`

"Nothing here" placeholder for a list, table or panel with no data.

```tsx
<EmptyState icon={InboxIcon} title="No tasks" description="You're all caught up." action={<Button>New task</Button>} />
<EmptyState size="sm" title="No contacts" />          {/* inside a card */}
<FilteredEmptyState onReset={clearFilters} labels={{ title: t("noResults"), reset: t("reset") }} />
```

`fill` makes it grow and center inside a flex column. Use `ErrorState` when
loading failed.

### `toast` / `Toaster`

Brief, non-blocking notices. Mount `<Toaster />` once near the app root, then
call `toast` from anywhere — components, query callbacks, plain functions:

```tsx
toast.success("Saved");
toast.error("Upload failed", { description: err.message });
toast("Offer deleted", { action: { label: "Undo", onClick: restore } });
const id = toast("Syncing…", { duration: Infinity }); toast.dismiss(id);
```

At most three show at once; errors stay 8s, everything else 4s, and the
countdown pauses while the toast is hovered or focused. `position` is
`bottom-center` (default), `bottom-right`, `top-center` or `top-right`;
`labels` translates the region name and the dismiss button.

### `MetadataList`

Label/value pairs for detail pages and side panels, rendered as a `<dl>`.

```tsx
<MetadataList
  columns={2}                       // 1 on phones, 2 from sm
  copyable                          // copy button on string/number values
  items={[
    { label: "Customer no.", value: customer.number },
    { label: "Phone", value: customer.phone },            // null → "—"
    { label: "Address", value: address, fullWidth: true },
    { label: "Owner", value: <Avatar name={owner} size="xs" />, copyable: false },
  ]}
/>
<MetadataList layout="horizontal" divided labelWidth="8rem" items={…} />
```

`layout="vertical"` (default) stacks label over value; `horizontal` puts the
label in a fixed column. `copyValue` sets the clipboard text when `value` is a
node. `labels` translates the placeholder and the copy button.

### `ProgressBar` / `CircularProgress`

```tsx
<ProgressBar value={42} label="Upload offer.pdf" />                       {/* 42% on the right */}
<ProgressBar value={18} max={24} label="Files" formatValue={(v, m) => `${v} / ${m}`} tone="success" />
<ProgressBar label="Preparing export…" />                                 {/* indeterminate */}
<CircularProgress value={70} aria-label="Import" size={44} showValue />
```

`role="progressbar"` with `aria-valuenow`/`-valuetext`; no `value` = indeterminate
(`aria-busy`, sliding segment via the Web Animations API, static under reduced
motion). Tones `default` `success` `warning` `error`; sizes `sm` `md` `lg`.
Without a visible `label`, pass `aria-label`.

### `Timestamp`

```tsx
<Timestamp value={row.modifiedAt} />                      {/* "vor 5 Min.", full date in a tooltip */}
<Timestamp value={row.createdAt} format="datetime" />      {/* 10.11.2026, 14:05 */}
<Timestamp value={iso} locale="en-GB" relativeStyle="long" />
```

Renders `<time dateTime>`. `value` is a `Date`, ISO string or epoch
milliseconds. Formats: `relative` (default), `date`, `datetime`, `time`.
`locale` defaults to `de-CH`. Relative text refreshes itself (every 10s while
under a minute, slowing to hourly); `live={false}` freezes it. `tooltip`
defaults to on for `relative`. `formatRelativeTime(date, now, locale)` is
exported for strings outside JSX.

### `Kbd` / `KeyCombo` / `ShortcutSheet`

```tsx
<KeyCombo keys="Mod+K" />                 {/* ⌘ K on a Mac, Ctrl K elsewhere */}
<KeyCombo keys="g o" />                   {/* G then O */}
<KeyCombo keys={["j", "ArrowDown"]} size="sm" labels={{ or: "oder" }} />
<ShortcutSheet open={open} onOpenChange={setOpen} groups={SHORTCUT_GROUPS} />
```

`+` joins keys pressed together, a space separates a sequence, an array lists
alternatives. `Mod` is ⌘ on Apple platforms and Ctrl elsewhere (`mac` forces
one). `ShortcutSheet` is the "?" dialog: groups with a title, optional hint,
and rows of `{ label, keys }`. The app owns the open state and the key
listener; build both from one list so they can't drift.

### `Avatar` / `AvatarGroup`

```tsx
<Avatar name="Anna Muster" src={photoUrl} status="success" statusLabel="online" />
<Avatar name="Sika Schweiz AG" shape="square" fit="contain" src={favicon} size="lg" />
<AvatarGroup items={team} max={4} labels={{ more: (n) => `${n} weitere` }} />
```

Initials (from the name or an email) show while the image loads and when it
fails, in a color derived from the name — the same person gets the same color
everywhere. Sizes `xs` `sm` `md` `lg` `xl`. `AvatarGroup` overlaps up to `max`
and shows "+N" with a tooltip listing the hidden names (never "+1": the last
avatar is shown instead).

### `CollapsibleSection`

```tsx
<CollapsibleSection title="Attachments" count={files.length} actions={<Button size="xs" variant="ghost">Add</Button>}>
  …
</CollapsibleSection>
<CollapsibleSection variant="card" title="Internal notes" defaultOpen={false}>…</CollapsibleSection>
```

Chevron + title + count pill; `actions` sit outside the toggle. Height
animates with a CSS grid-rows transition (instant under reduced motion). The
content stays mounted while closed (form state survives) but is `inert`. For a
bare toggle use the `Collapsible` primitive.

### `HoverCard`

```tsx
<HoverCard>
  <HoverCardTrigger href={`/users/${id}`}>Anna Muster</HoverCardTrigger>
  <HoverCardContent className="w-80"><UserPreview id={id} /></HoverCardContent>
</HoverCard>
```

Radix HoverCard with a 300ms open / 150ms close delay. It opens on hover and
keyboard focus, not on touch — keep it an extra, never the only way to reach
the information. Click-to-open content belongs in a `Popover`.

### `StatusDot`

```tsx
<StatusDot status="active" />                     {/* green dot + "Active" */}
<StatusDot tone="success" label="Online" pulse />
<StatusDot status={row.state} toneMap={{ offen: "info" }} hideLabel />
```

Same tones and status vocabulary as `StatusBadge`, for places where a pill is
too loud (table cells, presence). `hideLabel` keeps the text for screen readers.

### `DateInput`

A day field in the app's locale instead of the browser's own `type="date"`
format. The value is an ISO day (`"2026-11-10"`, `""` for none).

```tsx
<DateInput value={due} onValueChange={setDue} />           {/* 10.11.2026 */}
<DateInput value={due} onValueChange={setDue} locale="en-US" />
```

Typed text commits on blur or Enter; `3.2.26`, `03/02/2026` and ISO are all
accepted. Text that is no date marks the field `aria-invalid` and keeps the
previous value; `onInvalidChange` tells a form so it can block submit. With
`name`, a hidden input submits the ISO day. `parseIsoDay`, `formatIsoDay`, `datePlaceholder` and
`toLocalIsoDay` are exported for use outside the field.

### `PageHeader` / `Breadcrumbs`

The top of a page. Same props as OneSales's `ui/PageHeader` (`title`,
`badge`, `description`, `actions`, `onBack`) plus `backHref`, `breadcrumbs`,
`tabs` and `divider`; it renders inline instead of publishing into a shell
store. Actions wrap below the title on narrow screens.

```tsx
<PageHeader
  breadcrumbs={<Breadcrumbs items={[{ label: "Customers", href: "/customers" }, { label: customer.name }]} />}
  onBack={() => navigate(-1)}
  title={customer.name}
  badge="beta"
  description="Key account since 2014"
  actions={<Button size="sm">New offer</Button>}
  tabs={<TabsList>…</TabsList>}
  labels={{ back: t("common.back") }}
/>
```

`Breadcrumbs` is a `nav` > `ol` with the last item as `aria-current="page"`.
Past `maxItems` (default 4) the middle crumbs fold into a "…" dropdown
(`itemsBeforeCollapse`/`itemsAfterCollapse` choose what stays). Pass
`renderLink={({ href, className, children }) => <Link to={href} className={className}>{children}</Link>}`
for router links.

### `TablePage` / `TableShell` / `TableToolbar`

Lifted from OneSales's `ui/TableShell`: one panel in bands — toolbar → muted
meta strip → body → footer. `TablePage` puts a `PageHeader` on top and makes
the shell fill the remaining height, so the grid scrolls inside the panel and
header and pager stay put (give the parent a height).

```tsx
<TablePage
  title="Offers"
  actions={<Button size="sm">New offer</Button>}
  toolbar={
    <TableToolbar
      search={<TableSearch value={q} onChange={setQ} placeholder="Search offers…" />}
      filters={<StatusFilter />}
      actions={<RefreshButton />}
    />
  }
  meta={<TableResultCount shown={rows.length} total={total} />}
  footer={<Pagination page={page} onPageChange={setPage} totalItems={total} pageSize={25} />}
>
  <DataGrid … />
</TablePage>
```

No dependency on `@bmsuisse/datagrid`: the body takes any table or list.
`flush` drops the panel border for a shell inside a card; `fill` (default on
`TablePage`) makes the body a `min-h-0 flex-1` column. `TableResultCount`
reads "48 results", "12 of 48" or "48+ loaded" (`labels` translate; numbers
use `locale`, default `"de-CH"`). `TableShell`, `TableToolbar` and
`TableResultCount` take `data-testid`; the old `testId` prop still works as a
deprecated alias for OneSales.

### `Pagination`

```tsx
<Pagination
  page={page}
  onPageChange={setPage}
  totalItems={312}
  pageSize={pageSize}
  pageSizeOptions={[25, 50, 100]}
  onPageSizeChange={setPageSize}
/>
```

Shows first/last page, the current page and `siblingCount` (default 1) pages
around it with "…" gaps, keeping the slot count constant so the bar doesn't
jump (Astryx's rules; `getPageRange` is exported). Below `sm` — or always
with `compact` — it collapses to prev / "3 / 13" / next. Pass `pageCount`
instead of `totalItems` when the total is unknown; `labels` translate every
string including the "1–25 of 312" range; `locale` (default `"de-CH"`)
formats its numbers.

### `CommandPalette`

⌘K / Ctrl+K dialog for "do anything": grouped commands with icon, label,
description, shortcut hint and `keywords`, a fuzzy-ish filter (prefix > word
start > substring > all words in label/keywords > letters in order,
accent-insensitive), recent commands, arrow keys/Enter/Esc and an empty
state. Built on `Dialog` with its own list (no cmdk); the input drives the
list via `aria-activedescendant`, like `Combobox`.

```tsx
const [open, setOpen] = useState(false);
const { recent, push } = useRecentCommands("app");
useCommandPaletteHotkey(() => setOpen((o) => !o));

<CommandPaletteTrigger onClick={() => setOpen(true)} />   {/* top-bar pill with ⌘K hint */}
<CommandPalette
  open={open}
  onOpenChange={setOpen}
  commands={[
    { id: "new-offer", group: "Create", label: "New offer", icon: DocumentPlusIcon, shortcut: ["⌘", "N"], keywords: ["angebot"], onSelect: createOffer },
    { id: "delete", group: "Offer", label: "Delete offer", disabled: "Approved offers are locked", onSelect: remove },
  ]}
  recent={recent}
  onCommandRun={push}
/>
```

Registry (the idea from OneDocs's palette): wrap the shell in
`CommandRegistryProvider` and call `useRegisterCommands(commands)` in a page —
its commands show up in the palette while that page is mounted. An inline
array is fine: it only re-registers when ids/labels/groups (or other display
fields) change, and `onSelect` always calls the latest handler.
`onQueryChange` + `loading` let you merge server results into `commands`;
`filter` replaces the scoring; `groupOrder` fixes the section order.

### `SplitPane`

Two or more panes with draggable separators, lifted from OneDocs's
`layout/Splitter`. Sizes are percentages; limits are percentages or `"240px"`.

```tsx
<SplitPane defaultSizes={[30, 70]} storageKey="offers-master-detail">
  <SplitPanePanel minSize="200px" maxSize={50}><OfferList /></SplitPanePanel>
  <SplitPanePanel minSize="320px"><OfferDetail /></SplitPanePanel>
</SplitPane>
```

Separators are `role="separator"` with `aria-valuenow/min/max`; arrows move
them by `keyboardStep` (Shift ×5), Home/End jump to the limits, Enter or
double-click resets. Only the two neighbouring panes change. Pointer events
are disabled inside panes while dragging, so iframes don't swallow the drag.
`storageKey` stores the layout in `localStorage` (try/catch — blocked storage
just doesn't persist); `onSizesCommit` fires once per drag/keypress for
server-side persistence. `direction="vertical"` stacks the panes.

### `Toolbar`

A row of related controls that is one Tab stop: `role="toolbar"`, roving
tabindex, arrow keys (up/down when `orientation="vertical"`), Home/End,
disabled items skipped.

```tsx
<Toolbar aria-label="Text formatting">
  <ToolbarButton label="Bold" icon={BoldIcon} pressed={bold} onClick={toggleBold} />
  <ToolbarButton label="Italic" icon={ItalicIcon} pressed={italic} onClick={toggleItalic} />
  <ToolbarSeparator />
  <ToolbarButton label="Export" icon={ArrowDownTrayIcon} showLabel />
</Toolbar>
```

Icon-only buttons get `label` as `aria-label` and tooltip. Other controls join
the arrow-key order with a `data-toolbar-item` attribute. `overflow` measures
the buttons and folds those that don't fit into a "…" menu (toggles become
checkbox items). Only `ToolbarButton`s overflow — selects, wrapped buttons and
other children always stay visible. `variant="ghost"` drops the border.
### `DatePicker` / `DateRangePicker` / `Calendar`

`DatePicker` is `DateInput` plus a calendar button: type `3.2.26` or pick from
a month grid in a popover. Same ISO-day value and commit rules as `DateInput`.

```tsx
<DatePicker value={due} onValueChange={setDue} min="2026-01-01" />
<DateRangePicker value={period} onValueChange={setPeriod} />   {/* { from, to } ISO days */}
<Calendar value={day} onValueChange={setDay} />                 {/* always visible */}
<Calendar mode="range" value={range} onValueChange={setRange} isDateDisabled={isHoliday} />
```

`min`/`max` limit typed and picked days (typed days outside are marked
invalid). The calendar follows `locale` for month/weekday names and week start
(Monday in de-CH, Sunday in en-US; `weekStartsOn` overrides). Keyboard: arrows
by day/week, PageUp/PageDown by month (Shift: year), Home/End to the week's
ends. In a range the first click sets `from`, the second `to` (ordered);
`DateRangePicker` closes once both are set. Inside a Dialog/Sheet pass
`container` so the popover stays in the focus trap. `labels` translates the
button names.

### `NumberInput`

A number field in the app locale instead of `<input type="number">`. The value
is `number | null`.

```tsx
<NumberInput value={amount} onValueChange={setAmount} decimals={2} />       {/* 1’234.50 */}
<NumberInput value={qty} onValueChange={setQty} min={0} max={99} stepper />
```

Reads `1234,5`, `1'234.50`, `1 234` and `1.234,56` alike; commits on blur or
Enter; out-of-range numbers are clamped; junk sets `aria-invalid` and keeps the
old value (`onInvalidChange`). ArrowUp/ArrowDown step by `step` (Shift ×10,
float-safe). `size="sm"` is h-8. `parseLocaleNumber`/`formatLocaleNumber` are
exported.

### `InputGroup`

Icons, units or small buttons around an input, with one border and focus ring.

```tsx
<InputGroup>
  <InputGroupAddon>CHF</InputGroupAddon>
  <InputGroupInput aria-label="Price" />
  <InputGroupButton aria-label="Copy"><ClipboardDocumentIcon /></InputGroupButton>
</InputGroup>
```

Clicking an addon focuses the input; an invalid input reddens the group.

### `SegmentedControl`

Compact switch between 2–5 views or modes with a sliding thumb. Radiogroup
semantics: one tab stop, arrow keys move and select.

```tsx
<SegmentedControl aria-label="View" value={view} onValueChange={setView}
  options={[{ value: "list", label: "List", icon: ListBulletIcon }, { value: "board", label: "Board" }]} />
```

`size="sm"`, `fullWidth`, per-option `disabled`. Use `ButtonGroup` for
outlined connected buttons, `Tabs` when segments switch whole panels.

### `RadioList` / `RadioGroup`

```tsx
<RadioList aria-label="Shipping" value={shipping} onValueChange={setShipping}
  options={[{ value: "standard", label: "Standard", description: "3–5 days" }, …]} />
<RadioList variant="card" orientation="horizontal" … />
```

Each radio is named by its label and described by its description.
`RadioGroup` + `RadioGroupItem` are the bare Radix primitives for your own
layout.

### `Slider` / `RangeSlider`

`Slider` is the Radix primitive (one thumb per value). `RangeSlider` is a
two-thumb range with typed min/max `NumberInput`s:

```tsx
<Slider value={[volume]} onValueChange={([v]) => setVolume(v)} thumbLabels="Volume" />
<RangeSlider min={0} max={10000} step={100} value={price} onValueChange={setPrice}
  onValueCommit={refetch} unit="CHF" />
```

A typed low above the high is clamped to it. `onValueCommit` fires when a drag
ends or a typed bound commits — use it for expensive refetches.

### `FileInput`

Drop zone + file dialog + removable file list. Controlled; uploading is up to
you.

```tsx
<FileInput files={files} onFilesChange={setFiles} multiple accept=".pdf,.docx"
  maxSize={10 * 1024 * 1024} hint="PDF or Word, up to 10 MB" />
```

Files that don't match `accept` (also enforced on drop), exceed `maxSize`, or
go beyond `maxFiles` are refused with a visible error and passed to
`onReject`. Without `multiple` a new file replaces the old one. `size="sm"`
is a one-row zone. `labels` translates every string.

### `LoadingSpinner` / `LoadingOverlay`

`LoadingSpinner` is an inline spinner (`size` + optional `label`);
`LoadingOverlay` centers a larger one over its container.

### `Combobox`

A searchable single- or multi-select ("autocomplete box"), discriminated on
a `multiple` prop:

```tsx
// single-select — value: string | null
<Combobox options={options} value={country} onChange={setCountry} />

// multi-select — value: string[]
<Combobox multiple options={options} value={teamMembers} onChange={setTeamMembers} />
```

Options can carry a `group` key to render under a bold header, with a
tri-state "select all" checkbox per group in multi-select mode. Built on
this package's own `Popover`/`Input` rather than pulling in `cmdk` — a
plain substring filter over a manually rendered list is enough for the
sizes this component is used at.

### `Sidebar` / `SidebarNav` / `NavGroup` / `NavItem`

The app shell's left navigation panel: fixed-width or drag-resizable
(`resizable`), with an optional icon-only rail-collapse mode (`collapsed` +
`onCollapsedChange`) that shows each `NavItem`'s label in a hover tooltip
instead. `NavGroup` sections are independently collapsible; a group's header
shrinks to a thin divider — not disappear — while the sidebar itself is
rail-collapsed, since its items (icons only) stay visible.

```tsx
<Sidebar
  collapsed={collapsed}
  onCollapsedChange={setCollapsed}
  resizable
  header={(isCollapsed) => (isCollapsed ? <CompactLogo /> : <Logo />)}
  footer={<UserMenu />}
>
  <NavGroup label="Work">
    <NavItem as={Link} to="/overview" icon={LayoutGrid} label="Overview" active={pathname === "/overview"} />
    <NavItem as={Link} to="/approvals" icon={ClipboardCheck} label="Approvals" active={pathname.startsWith("/approvals")} />
  </NavGroup>
</Sidebar>
```

`NavItem` is polymorphic via `as` (defaults to `<a>`) so it renders whichever
router `Link` the app uses — it has no router opinion, so `active` is always
computed by the caller. For a mobile drawer, don't reuse `Sidebar` itself
(the resize handle and rail-collapse toggle don't apply there); render the
same `NavGroup`/`NavItem` children inside a `Sheet`, wrapped in `SidebarNav`
for the same scroll-fade behavior.

The active-row accent and the panel background are driven by two dedicated
tokens, `--nav-primary` and `--sidebar`, kept separate from `--primary`/
`--background` specifically so a multi-brand app can theme its sidebar
independently per brand (e.g. via a `[data-brand="..."]` attribute) without
touching the rest of its palette. See
[Getting started](/ui/getting-started#sidebar-tokens) for how to register
them.

See the [interactive demo](https://bmsuisse.github.io/bmsui/demo/ui/) for all of these rendered
together.

### `KpiCard`

Dashboard metric tile in four variants: `hero` (large, primary-colored, for
the single headline metric on a page), `default` (bordered card for a KPI
grid), `mini` (compact, for dense grids of secondary metrics), and `donut`
(a proportion breakdown). All optionally show a `badge`, a trend `sparkline`,
and a `loading` skeleton state; `hero` additionally supports a `progress` bar
for a target-achievement readout.

```tsx
<KpiCard
  label="Revenue"
  value="1.2M"
  variant="hero"
  icon={DollarSign}
  badge={{ text: "+12%", positive: true }}
  progress={72}
  progressLabel="72% of target"
  sparkline={[4, 6, 5, 8, 7, 9, 11, 10, 13]}
/>
```

`value` is a pre-formatted `string | number` — the component has no currency
or locale opinion, so format it (CHF, percentages, thousands separators)
before passing it in. The `default` variant additionally splits a
space-separated value like `"42 %"` into a large number plus a small
prefix/suffix unit. `subTone` (`default`/`warn`/`danger`) colors the `mini`
variant's `sub` text for at-a-glance status (e.g. an overdue count). The
`Sparkline` mini line-chart is also exported on its own for reuse outside a
`KpiCard`.

The `donut` variant renders a `segments` breakdown (`{ label, value, color? }[]`)
as a ring chart with a legend showing each segment's share, and an optional
`centerValue` (defaults to the sum of `segments`' values) in the middle of the
ring:

```tsx
<KpiCard
  label="Revenue by channel"
  variant="donut"
  centerValue="1.2M"
  segments={[
    { label: "Direct", value: 52 },
    { label: "Partners", value: 31 },
    { label: "Online", value: 17 },
  ]}
/>
```

Segments without an explicit `color` cycle through a shared `--chart-1`..
`--chart-6` palette (falling back to fixed hex values if unregistered), so
every proportion breakdown in an app looks consistent and can be re-themed
in one place — see
[Getting started](/ui/getting-started#chart-tokens) for how to register
them. The `DonutChart` ring itself is also exported on its own for reuse
outside a `KpiCard`.

### `SearchPanel` / `SearchTrigger`

A bordered search card (`SearchPanel`) and an icon-only header button that
opens one (`SearchTrigger`). Together they cover a topbar search icon that
expands into an input with a keyboard-shortcut hint and mode-switcher pills —
without dictating what triggers the open/close or what renders the results.

```tsx
<SearchTrigger onClick={() => setOpen(true)} />

{open && (
  <SearchPanel
    value={query}
    onChange={setQuery}
    isLoading={isSearching}
    shortcutHint="⌘K"
    modes={[
      { key: "search", label: "Search", icon: Search },
      { key: "ask", label: "Ask AI", icon: Sparkles },
    ]}
    activeMode={mode}
    onModeChange={setMode}
  />
)}
```

`SearchPanel` is headless on results: it renders only the input row and the
optional mode-pill row, and leaves any dropdown or inline results list to the
caller. Pass `expanded` to square its bottom corners when a results panel is
anchored directly beneath it, and `trailingSlot` for extras like a mic
button. For an always-visible filter input instead of an icon-triggered
overlay, use `SearchBar`.

### `AiButton` / `AiExplainButton`

The "do something with AI" affordance: a sparkle icon plus a built-in
in-flight state on top of `Button`'s three violet `ai` variants (`ai` solid
CTA, `ai-subtle` tinted chip — the default — and `ai-ghost` inline action).
Every other `Button` prop (`size`, `asChild`, `data-testid`, …) still
applies, and the ref is forwarded.

```tsx
<AiButton variant="ai" loading={isGenerating} onClick={generate}>
  Generate description
</AiButton>

<AiButton icon={Wand2}>Rewrite</AiButton>
```

`AiExplainButton` is the "what am I looking at?" case — an `AiButton` next
to a KPI, a chart or a form field that opens a popover and asks the
caller's model to explain it. `onExplain` runs the first time the popover
opens (not on mount, so nothing is spent on a button nobody clicks) and
returns any node, so an explanation can be prose, a list, or a small
rendered breakdown. A rejection renders as an `AlertBox` with a "Try again"
button.

```tsx
<AiExplainButton
  title="Why is revenue up?"
  onExplain={() => api.explain({ metric: "revenue", window: "30d" })}
/>
```

The `ai` variants use a fixed Tailwind palette (violet), the same choice as
`Badge`'s `warning` and `AlertBox`'s warning/info/success tones, since the
base shadcn/ui theme has no AI-accent token — so unlike `swiss-primary`
they need no setup in the consuming app. Use `<Button variant="ai">`
directly when you want the accent without the sparkle/loading behaviour.

### `VoiceInputButton` / `VoiceTranscript` / `useSpeechRecognition`

Dictation, on the browser's built-in `SpeechRecognition` by default — no API
key, no audio upload, no extra dependency. `VoiceInputButton` is an
`outline` microphone button that takes the `destructive` tint while
listening and reports each finalized chunk of speech:

```tsx
<VoiceInputButton
  lang="de-CH"
  onTranscript={(text) => setNote((v) => (v ? `${v} ${text}` : text))}
/>
```

Where the API is missing (Firefox, most mobile browsers) the button renders
disabled with a crossed-out mic and an explanatory `title` rather than
disappearing, so the layout doesn't shift between browsers. Check
`useSpeechRecognition().supported` if you'd rather branch yourself.
`onError` receives the recognizer's raw code (`"not-allowed"`,
`"no-speech"`, …); `describeSpeechError(code)` turns it into a sentence a
user can act on, or `null` for the `aborted` code every programmatic stop
emits.

Pass `engine` to back dictation with something other than the browser API —
a server-side transcription endpoint, for example — instead of (or as a
fallback for browsers without) `SpeechRecognition`. It's a factory called
once per `start()`; the object it returns just needs to satisfy
`SpeechRecognitionEngine` (`start`/`stop`/`abort` plus `onresult`/`onerror`/
`onend`, matching the shape of the Web Speech API this wraps by default).
Supplying `engine` also makes the button render enabled unconditionally,
since browser support no longer applies:

```tsx
<VoiceInputButton
  onTranscript={(text) => setNote((v) => (v ? `${v} ${text}` : text))}
  engine={() => createServerSpeechEngine({ endpoint: "/api/transcribe" })}
/>
```

`createServerSpeechEngine` above is application code, not part of this
library — it just needs to open whatever connection your backend expects
(a WebSocket, `MediaRecorder` chunks over `fetch`, …), and call `onresult`/
`onerror`/`onend` the way `SpeechRecognition` does.

`VoiceTranscript` is the composed workflow: dictate into an editable
transcript, then hand it to a model and swap in the result — with one-click
undo, since a model rewriting your own words is exactly where you want an
escape hatch. It's controlled (like `SearchBar`), and `onTransform` can be
async; a rejection (or a mic error) renders as an `AlertBox` under the
buttons and leaves the transcript untouched.

```tsx
<VoiceTranscript
  value={note}
  onChange={setNote}
  onTransform={(text) => api.rewrite(text)}
  transformLabel="Clean up with AI"
/>
```

Omit `onTransform` for plain dictation without the AI action. `VoiceTranscript`
forwards `engine` straight to its internal `VoiceInputButton`.
