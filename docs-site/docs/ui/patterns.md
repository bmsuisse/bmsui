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

### `TabStrip`

A responsive tab strip modeled on OneSales' customer-detail tabstrip: renders as
many `tabs` as fit the available width inline, collapsing the rest into a "More"
dropdown as the container shrinks (or as more tabs are added). Built on this
package's own `Tabs` primitives, so it's a controlled component like the rest of
this list — `value` / `onValueChange` work exactly like Radix's `Tabs.Root`.

```tsx
<TabStrip
  tabs={[
    { id: "overview", label: "Overview", content: <OverviewPanel /> },
    { id: "orders", label: "Orders", content: <OrdersPanel /> },
    // ...
  ]}
  value={activeTab}
  onValueChange={setActiveTab}
/>
```

Content is lazy-mount: `content` for a tab only renders once that tab is first
activated (inherited from Radix `Tabs.Content`'s default, un-`forceMount`ed
behavior), so an unopened tab never runs its component or fetches its data. It's
not keep-alive, though — switching away unmounts that tab's content again, so
per-tab local state doesn't survive a round trip unless you lift it out.

`TabStrip` deliberately has no opinion on *which* tabs exist or their order —
that's just whatever subset/order of `tabs` the caller passes in. A per-user
"which tabs do I want to see" preference (loaded from a saved setting, an API
call, `localStorage`, ...) is entirely the caller's to filter and persist; the
component's only job is deciding, given however many tabs it was handed, how
many fit inline before the rest collapse behind "More". The currently active
tab is always kept reachable inline, swapping in for whichever tab is closest
to the overflow boundary if a resize would otherwise hide it.

See the [interactive demo](https://bmsuisse.github.io/bmsui/demo/ui/) for all of these rendered
together.
