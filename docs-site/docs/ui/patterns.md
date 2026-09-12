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
before passing it in. Every variant then steps a leading currency code or a
trailing unit down in size (`"CHF 1.2 Mio."` reads as a small `CHF` plus a big
`1.2 Mio.`, `"42 %"` as `42` plus a small `%`), so the magnitude is the only
thing a rep scans on a phone. `badge.positive` drives the delta's colour and
arrow: `true` is green/up, `false` red/down, omitted stays neutral (a count,
not a direction). `subTone` (`default`/`warn`/`danger`) colours `sub` for
at-a-glance status (e.g. an overdue count).

Pass `href` (an `<a>`) or `onClick` (a `<button>`) to make the **whole tile**
the tap target — with press feedback and a focus ring — instead of relying on
a small icon link. The tiles are sized mobile-first for a two-column grid at
320–430px: labels clamp to two lines, and the mini variant hides its sparkline
below ~176px of tile width when a `sub` line is also present (a container
query, not a viewport breakpoint). The `Sparkline` mini line-chart is also
exported on its own for reuse outside a `KpiCard`.

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

### `SearchBar`

Pill-shaped, always-visible search input for filtering a table or list. 44px
tall with 16px type on a phone (16px is what stops iOS Safari zooming the page
on focus), 40px/15px from `md`. Ships mobile keyboard defaults — a "Search"
return key, no auto-capitalisation, no autocorrect on article numbers — via
the exported `searchInputKeyboardProps`, all overridable through the input
props spread.

```tsx
<SearchBar
  value={query}
  onChange={setQuery}
  isLoading={isFetching}
  onSubmit={runSearch}          // Enter / the keyboard's Search key
  trailingSlot={<VoiceMicButton />}
  placeholder="Search customers…"
/>
```

A clear (×) button appears once there is a value (Escape clears too); pass
`onClear={false}` to hide it or a function to override what it does.

### `SearchPanel` / `SearchTrigger` / `SearchOverlay`

`SearchPanel` is the search card itself: an input row (leading icon/spinner,
input, clear button, optional `trailingSlot` and `shortcutHint`) plus an
optional row of mode-switcher pills. It is headless on results and works in
page flow — Cockpit's in-canvas hero search — with `expanded` squaring its
bottom corners so a results dropdown beneath reads as one surface.
`appearance="flush"` drops the card chrome for embedding in a header or an
overlay that already draws the surface.

`SearchTrigger` is the button that opens a search: `variant="icon"` (default)
for a toolbar, `variant="field"` for a header where the search deserves to be
seen — a field-shaped button with `placeholder` text and a `shortcutHint`.

`SearchOverlay` is the presentation for a global, command-palette style
search. On a phone it takes over the screen (back button, input, results
scrolling beneath, sized to the *visual* viewport so the on-screen keyboard
never covers the results); from `breakpoint` (default `md`) up it is a
centered dialog. Escape clears a non-empty query first and closes on the
second press. Results are `children`; the input focuses itself on open in a
way iOS Safari accepts as part of the opening tap.

```tsx
<SearchTrigger variant="field" placeholder="Customers, articles, places…" shortcutHint="⌘K" onClick={() => setOpen(true)} />

<SearchOverlay
  open={open}
  onOpenChange={setOpen}
  value={query}
  onChange={setQuery}
  isLoading={isSearching}
  modes={[
    { key: "search", label: "Search", icon: Search },
    { key: "ask", label: "Ask AI", icon: Sparkles },
  ]}
  activeMode={mode}
  onModeChange={setMode}
  footer={<KeyboardHints />}
>
  <ResultsList … />
</SearchOverlay>
```

The `useVisualViewportHeight` hook the overlay uses is exported for callers
that build their own keyboard-aware sheets.
