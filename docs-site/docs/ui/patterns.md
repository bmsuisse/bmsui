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

### `ToastProvider` / `useToast`

Transient notifications. Mount `ToastProvider` once near the app root
(outside anything that re-mounts on navigation), then call `useToast()`
anywhere below it:

```tsx
const { toast, dismiss } = useToast();

toast.success("Customer saved", { description: "Muster Bau AG · 10023" });
toast.error("Sync failed", {
  description: "3 visit reports could not be uploaded.",
  action: { label: "Retry", onClick: retry },
});
await toast.promise(sendOffer(), {
  loading: "Sending offer…",
  success: (ref) => `${ref} sent`,
  error: "Could not send offer",
});
```

Variants: `success`, `error`, `warning`, `info`, `neutral`, `loading`.
Timed toasts auto-dismiss after the provider's `duration` (5s) with a thin
progress bar that pauses on hover, focus, or when the window loses focus;
`error` and `loading` toasts stay until dismissed or updated. Reusing an
`id` (or calling `update`) changes a toast in place — how "Saving…" becomes
"Saved". The stack is capped at `max` (3); the oldest non-error toasts retire
first, errors never get pushed out by a flood of successes.

On a phone the stack is full-width at the bottom, clear of the home
indicator; from `sm` up it anchors at `position` (`bottom-right` default,
`top-right`, `top-center`, `bottom-center`). Built on Radix Toast, so the
region is announced to screen readers (assertively for errors/warnings,
politely otherwise), F8 focuses the stack, Escape dismisses the focused
toast, and a right swipe dismisses on touch.

### `Stepper`

Wizard progress indicator: numbered markers joined by connectors, completed
steps ticked and clickable, the current one filled, upcoming ones muted.

```tsx
<Stepper
  steps={[
    { id: "upload", label: "Upload", description: "Capture" },
    { id: "match", label: "Match articles" },
    { id: "review", label: "Review prices", error: hasPriceErrors },
    { id: "send", label: "Send offer" },
  ]}
  activeStep={step}
  furthestStep={furthestVisited}
  onStepChange={setStep}
/>
```

Completed steps are buttons once `onStepChange` is set; `furthestStep`
additionally unlocks steps ahead the user has already visited. Omit
`onStepChange` for a read-only indicator. `error: true` on a step turns
its marker red wherever it sits. Below `md` a horizontal stepper collapses
to a compact bar — the active label, a "Step 3 of 5" counter
(`formatCounter` for other languages) and a segmented track — because five
labelled markers never fit a phone without truncating the labels they exist
to show; `mobile="full"` keeps the markers and scrolls them instead.
`orientation="vertical"` stacks the steps for a side rail or a settings-style
flow. The component owns only the indicator: step content and the
Back/Next buttons stay with the caller, whose form state decides what
"next" means.

### `EmptyState`

The placeholder a list, table, search result or panel shows when there is
nothing to render — built to teach the interface, not just say "nothing
here".

```tsx
<EmptyState
  title="No offers yet"
  description="Upload a supplier quote and the parser turns it into an offer."
  action={{ label: "Upload quote", icon: FileUp, onClick: openUpload }}
  secondaryAction={{ label: "Create manually", onClick: createBlank }}
/>

<EmptyState variant="error" title="Couldn't load visit reports" action={{ label: "Try again", onClick: refetch }} />
```

`variant` picks the default icon and tone: `empty` (nothing created yet),
`no-results` (a search/filter excluded everything — offer to widen it),
`error` (a failed load, rendered as `role="alert"` with a destructive tint
and an outline retry button), `offline`. `size="sm"` is the in-card version
for a dashboard tile; `fill` stretches to center inside a flex-column
region. Pass `icon` to override the default, and `children` for a hint or
link under the actions.

### `AiMarker` / `ConfidenceIndicator`

The shared vocabulary for anything a model touched. `AiMarker` is a sparkle
glyph plus an optional label marking a field, summary or suggestion as
AI-provenance rather than human-authored; `ConfidenceIndicator` renders a
model's confidence score as a 3-bar signal meter plus a qualitative label
instead of a percent a reader would over-trust.

```tsx
<AiMarker />
<AiMarker variant="inline" label="AI generated" />
<AiMarker pulse label="Extracting…" />

<ConfidenceIndicator value={0.94} />
<ConfidenceIndicator value={0.42} />
<ConfidenceIndicator value={null} />
<ConfidenceIndicator value={0.87} format="percent" />
```

`AiMarker`'s `variant="chip"` (default) sits in its own tinted pill; `inline`
drops the background for sitting mid-sentence. `pulse` is the "AI is
thinking" state — a slow opacity/scale breathe, not a spinner — and swaps in
`role="status"` so the caller's in-progress label (`"Extracting…"`) is
announced. There is deliberately no separate "AiThinking" component with
rotating phrases and step lists; that's chat-surface territory, and a plain
wait still uses `LoadingSpinner`.

`ConfidenceIndicator` takes a `value` in `0..1` (`null`/`undefined`/`NaN`
renders the "unknown" state) and buckets it against `thresholds` (default
`{ high: 0.85, medium: 0.65 }`) into three bands, each with a fixed colour
rule the team doesn't deviate from: **never green** (green means
human-verified, like `StatusBadge`'s `approved`/`paid` tone — a model's 90%
isn't that), **never red** (low confidence is a prompt to look, not an
error), **amber only at low**. `format` controls what renders — `meter`
(bars only), `meter-label` (default), `label`, or `percent` for a dense
table column. It isn't a `StatusBadge` variant (a continuous score with
thresholds, not a discrete status-to-tone map) and isn't a progress bar (a
64px bar implies a precision uncalibrated model scores don't have). The band
logic is exported as `resolveConfidenceBand` so anything stating a
confidence in words stays in lockstep with the bars beside it.

### `AiSuggestion`

Wraps a proposed value — a parsed field, an extracted note, a suggested
catalog match — with accept / edit / reject, and restore once dismissed.

```tsx
<AiSuggestion
  status={status}
  confidence={0.91}
  label="Suggested from PDF"
  meta="gpt-x · 2 min ago"
  onAccept={() => setStatus("accepted")}
  onEdit={() => setStatus("edited")}
  onReject={() => setStatus("rejected")}
  onRestore={() => setStatus("pending")}
>
  <span>Art. 48213 — Stainless steel elbow 90°, DN50</span>
</AiSuggestion>
```

`status` is **controlled only**: a form's dirty-field guard needs to own the
accept → edited transition itself, so no uncontrolled convenience mode is
offered until a second consumer actually needs one. The five statuses drive
five states — `loading` (a pulsing `AiMarker` plus skeleton lines), `pending`
(the full proposal: AI-coloured rail, header with `AiMarker` / label /
`ConfidenceIndicator`, then Accept/Edit/Reject), `accepted` and `edited`
(rail and tint go, but a dimmed `AiMarker` stays as permanent provenance — a
reader must still be able to tell a model produced this), and `rejected` (a
muted row with Restore). `layout="inline"` collapses the whole thing into one
dense row for a field list where a card per field would be unusable. A bulk
"accept all high-confidence" control is composed by the consumer with
`ButtonGroup`; there is no built-in "why did the model say this" panel —
`meta` covers model and time, deeper explanation is app content.

### `ActionButton` / `ActionSheet`

The floating "+" that replaces a tab-bar FAB plus an app's own hand-rolled
bottom sheets: a 56px circle opening an `ActionSheet` list on a phone, a 36px
trigger with a `DropdownMenu` from `md` up. A radial speed dial was rejected
for this — 40px unlabelled targets, no room for six to eight contextual
actions, and a poor screen-reader story.

```tsx
<ActionButton
  label="Quick actions"
  placement="corner"
  actions={[
    { id: "new-order", label: "New order", sublabel: "Start from a blank form", icon: Plus, onSelect: createOrder },
    { id: "scan", label: "Scan barcode", icon: ScanLine, onSelect: openScanner },
  ]}
  secondaryActions={[{ id: "search", label: "Search", icon: Search, onSelect: openSearch }]}
  sheetTitle="New"
/>
```

`placement="corner"` is `position: fixed` at `z-40` (above content, below
every `z-50` overlay this library ships, far below the Toast viewport's
`z-[100]`); `placement="docked"` is static, sized for a consumer's own
tab-bar slot, with a `ring-4 ring-background` to punch it out of that bar.
`hideOnKeyboard` (default `true`) slides the corner button away once the
visual viewport shrinks more than 150px, so it never sits on top of an
on-screen keyboard. `onClick` with no `actions` renders a plain button and no
sheet at all. Selecting a row closes the sheet *before* running `onSelect`,
so navigation never races the close animation. `ActionSheet` is exported
standalone for replacing a hand-rolled bottom sheet directly.

Two contracts other patterns rely on:

- **`--ui-bottom-inset`**: a CSS custom property, default
  `env(safe-area-inset-bottom, 0px)`, read by the Toast viewport, by
  `ActionButton placement="corner"`, and by `ActionSheet`'s bottom padding. A
  consumer with a 72px tab bar sets it once — `--ui-bottom-inset: calc(72px +
  env(safe-area-inset-bottom));` on `<body>` — instead of passing a one-off
  `viewportClassName="pb-20"` to `ToastProvider`.
- **`data-ui-fab`**: while a `corner` `ActionButton` is mounted it sets
  `data-ui-fab="right"` (or `"left"`) on `<html>` and removes it on unmount
  (reference-counted). `ToastProvider`'s viewport reads that attribute with a
  plain CSS selector to reserve a column, so a toast never lands under the
  button. `placement="docked"` never sets it.

### `NotificationBell` / `NotificationCard` / `NotificationPanel`

`Toast` is feedback about what you just did (saved, failed, undo) — five
seconds at the thumb edge. This trio is for events that happened elsewhere
(a background job finished, an approval landed, a reminder came due):
persistent until acted on, carrying actor, time and actions, with an inbox to
find it again. Never route an event through `toast()`.

```tsx
<NotificationBell ref={bellRef} count={unreadCount} open={open} onClick={() => setOpen((v) => !v)} />

<NotificationPanel open={open} onOpenChange={setOpen} anchor={bellRef} unreadCount={unreadCount} onMarkAllRead={markAllRead}>
  {notifications.map((n) => (
    <NotificationCard
      key={n.id}
      title={n.title}
      body={n.body}
      timestamp={n.timestamp}
      unread={n.unread}
      source={n.source}
      actor={n.actor}
      priority={n.priority}
      onSelect={() => markRead(n.id)}
      onDismiss={() => remove(n.id)}
    />
  ))}
</NotificationPanel>
```

`NotificationBell` forwards its ref so `NotificationPanel` can anchor a
desktop `Popover` to it; `open` only drives pressed styling and
`aria-expanded` — the consumer's boolean stays the single source of truth.
`NotificationPanel` is headless about data: it renders whatever
`NotificationCard`s you pass as `children`, in the order you already sorted
them. "New"/"Earlier" grouping, fetching, realtime, read-state sync and
desktop drag-resize are all deliberately left to the consumer. Below `md` it
renders as a bottom `Sheet` at 85vh rather than a desktop drawer squeezed
onto a phone; at `md`+ it's a 400px `Popover` anchored to the bell.

`NotificationCard` doubles as the inbox row (`density="row"`) and the arrival
banner (`density="card"`). `source="ai"` renders the shared `AiMarker`;
`person` renders the actor's initials or `avatarUrl`; `system` gets a neutral
icon. `priority="high"` adds a primary rail. With `href` the card root is a
real anchor, with `onSelect` a button, with neither a plain `div` — and in
every case the clickable surface is a stretched overlay *sibling* of the
visible content, never a wrapper, so `actions` and the dismiss `×` never end
up nested inside the card's own `<a>`/`<button>`.

### `NotificationBanner`

The arrival surface for a high-value event — one at a time, at the top of the
screen. `NotificationBanner` is the moment an event lands; `NotificationPanel`
is where it lives afterwards. Both render the same `NotificationCard`, so the
two surfaces never disagree about what a notification looks like.

```tsx
<ToastProvider>
  <NotificationBannerHost>
    <App />
  </NotificationBannerHost>
</ToastProvider>
```

```tsx
const { show, dismiss } = useNotificationBanner();

show({ title: "New comment from Maria Keller", source: "person", actor: { name: "Maria Keller" }, timestamp: new Date() });
show({ title: "Approval required", priority: "high", timestamp: new Date(), actions: [{ label: "Review", onClick: openReview }] });
```

**Anchored at the top on purpose.** On a phone the `Toast` stack already owns
the bottom edge, and a corner `ActionButton` owns it too. Putting arrivals at
the top means no overlap contract has to exist between the three surfaces —
they simply never occupy the same space.

`priority="high"` never auto-dismisses; `normal` clears after 8s (longer than
a toast's 5s — an event takes longer to read than "Saved"), paused on hover
and focus. Dismiss by swiping up, the `×`, or Escape. High-priority banners
are announced as `foreground` and are never silently evicted by a flood of
normal arrivals.

**Two Radix Toast providers, and the one caveat:** `NotificationBannerHost`
mounts its own `@radix-ui/react-toast` provider, independent of
`ToastProvider`, and both are safe to mount around the same app. But two
providers means two default F8 hotkeys competing, so the banner viewport is
given `hotkey={[]}`: **F8 always reaches the toast viewport, never the banner
host.**

### `AiActivity`

The live "AI is doing X" strip and the finished-turn collapsed step summary,
unified into one component because they turned out to be the same shape in
two lifecycle states.

```tsx
<AiActivity status="running" idleLabel="Looking up recent orders…" />

<AiActivity
  status="done"
  steps={[
    { id: "lookup", label: "Queried supplier ledger", status: "done" },
    { id: "send", label: "Send email to purchasing@sika.ch", status: "denied" },
  ]}
/>
```

`status` is explicit, never inferred from `steps` — a turn can be `"running"`
with no step yet (idle label only), and `"done"` while a step is still stuck
at `status: "running"` (a stream cut off mid-call). The disclosure defaults
open whenever any step is `denied` or `interrupted`, so a blocked or
cancelled tool call can never hide behind a collapsed "N more". Colour rule
matches `ConfidenceIndicator`'s: `running`/`done` are muted (never green — a
finished tool call isn't a success signal), `failed` is destructive red,
`denied`/`interrupted` share the amber pair used across the library. The
nested glyph is always `<AiMarker decorative />` — the root already owns
`role="status"` while running, so `AiMarker`'s own live region would
announce the same event twice.

### `ChatMessage` / `ChatMessageSkeleton`

One transcript turn — a right-aligned user bubble or a full-width assistant
prose block — plus its loading placeholder.

```tsx
<ChatMessage role="user">Who's the usual supplier for gypsum board?</ChatMessage>
<ChatMessage role="assistant" marker>There are two Sika accounts that match.</ChatMessage>
<ChatMessage role="assistant" error="The lookup timed out.">Partial result…</ChatMessage>

<ChatMessageSkeleton turns={3} />
```

`marker` prefixes the assistant bubble with an `AiMarker` — pass `true` for
the default, or a node to replace it. There's no `aria-live` here on
purpose: a headless chat runtime (assistant-ui) already owns the viewport's
live region, and a second one on every message would double-announce a
streaming reply. The `actions` row (copy/regenerate) reserves a fixed
`min-h-7.5` so its buttons never reflow the message above when they fade in.

### `SuggestionChips`

"Here's what you can ask" offers, collapsing five ad hoc treatments (a
welcome list, a sidebar hint, a bottom-sheet list, empty-state ghost pills, a
follow-up scroller) into one data model and three `layout`s.

```tsx
<SuggestionChips
  layout="row"
  suggestions={[
    { id: "summarize", label: "Summarize this thread", icon: Sparkles },
    { id: "draft", label: "Draft a reply", icon: MessageSquare },
  ]}
  onPick={(s) => sendSuggestion(s)}
/>
```

`list` is a vertical card stack for an empty/welcome state; `row` is a
one-line horizontal scroller with RTL-aware edge fades, for follow-ups under
a finished turn; `wrap` (default) is centred wrapping pills. None of the
three use a primary fill — a suggestion is an offer, not a selection, so a
solid brand colour would misrepresent it as already chosen. `onDismiss`
renders the `×` as a sibling button, never nested inside the chip, since a
`<button>` inside a `<button>` is invalid HTML.

### `ChoiceBlock`

An inline decision surface for a chat transcript — a "which of these did you
mean?" disambiguation prompt and an amber human-in-the-loop approval card
are the same shape (an options array, one selection), so this is one
component with a `tone`.

```tsx
<ChoiceBlock
  question="Which supplier account?"
  options={[{ id: "a", label: "Sika – VE PCI" }, { id: "b", label: "Sika – Bauchemie" }]}
  value={choice}
  onSelect={(option) => setChoice(option.id)}
/>

<ChoiceBlock
  tone="warning"
  eyebrow="Approval required"
  question="Send the reorder email?"
  options={[{ id: "approve", label: "Approve" }, { id: "deny", label: "Deny" }]}
  value={approval}
  onSelect={(option) => setApproval(option.id)}
/>
```

`value` is controlled, with no memory of its own — once a question is
answered, the consumer flips `disabled` but keeps passing the same `value`,
and the chosen option stays highlighted while its siblings dim, so a
decision made turns ago still reads as settled when scrolling back through
the transcript. `keyboardShortcuts` (default `true`) binds `1`–`9` then
`A`–`Z`, but the listener bails whenever a `TEXTAREA`/`INPUT`/
`contentEditable` is focused, so it never steals a keystroke from the
composer. `tone="warning"` fills the chosen option with amber, never the
primary colour — the choice is a consequential, human-authorized action, not
an ordinary preference pick.

### `ChatComposer` / `ChatComposerInput` / `ChatSendButton`

The chat input shell, its auto-growing textarea, and the send/stop button
that occupies one spot in the action row.

```tsx
<ChatComposer action={<ChatSendButton state={sending ? "stop" : "send"} onClick={toggleSend} />}>
  <ChatComposerInput
    value={draft}
    onChange={(e) => setDraft(e.target.value)}
    onSubmit={() => send(draft)}
  />
</ChatComposer>
```

`ChatComposer` owns only layout and the `dragging`/`disabled` visual states —
never the typed value or submission, since every real consumer here runs on
a headless chat runtime (assistant-ui) that already owns that state.
`ChatComposerInput` is deliberately a plain, borderless textarea (the shell
already draws the card border) at `text-base` (16px), which is load-bearing:
anything smaller makes iOS Safari zoom the page on focus. `ChatSendButton`
morphs between `"send"` and `"stop"` in the same slot rather than swapping
in two different elements, so the composer never jitters while a reply is
streaming; it's sized `size-10 md:size-8` to stay above this library's
40px/32px touch-target floor.

### `ScrollToBottomButton`

The "jump back to the latest message" pill that floats just above a chat
composer once the reader has scrolled up.

```tsx
<ScrollToBottomButton visible={hasNewMessages} onClick={scrollToBottom} />
```

It only renders the button — a headless runtime already tracks scroll
position and unread count and passes them in as `visible`/`onClick`.
`visible={false}` maps onto the button's own `disabled` (styled
`disabled:invisible`, not unmounted) rather than a separate prop, so this
component works unchanged as a runtime `render` target that toggles
`disabled` to mean "not applicable right now."
