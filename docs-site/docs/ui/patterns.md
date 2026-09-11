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

Segments without an explicit `color` cycle through a built-in palette. The
`DonutChart` ring itself is also exported on its own for reuse outside a
`KpiCard`.
