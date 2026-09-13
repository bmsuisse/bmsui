---
title: Getting started
---

# @bmsuisse/ui

Shared shadcn/ui-based React primitives and composed UI patterns.

```bash
npm install @bmsuisse/ui
```

Peer dependencies: `react` and `react-dom` (`^18` or `^19`).

## Usage

```tsx
import { Button, FormField, AlertBox } from "@bmsuisse/ui";

function Example() {
  return (
    <FormField label="Name">
      <input />
    </FormField>
  );
}
```

Every component `@bmsuisse/ui` exports is styled with Tailwind utility
classes against the standard shadcn/ui semantic tokens (`bg-primary`,
`text-muted-foreground`, `border-input`, `--radius`, …). Your app's own
Tailwind config needs to already define those tokens — this package doesn't
bundle a stylesheet or a Tailwind preset, the same way a hand-written
shadcn/ui component wouldn't. If you're not already using shadcn/ui, see
[its theming docs](https://ui.shadcn.com/docs/theming) for the token set to
add.

### Sidebar tokens

`Sidebar`/`NavItem` use two extra tokens beyond the base shadcn/ui set,
`--nav-primary` (active-row accent) and `--sidebar` (panel background) —
kept separate from `--primary`/`--background` so a multi-brand app can theme
just its sidebar per brand. Register them the same way as the base tokens,
in your `@theme` block and `:root`:

```css
@theme inline {
  /* ...your existing tokens... */
  --color-nav-primary: var(--nav-primary);
  --color-sidebar: var(--sidebar);
}

:root {
  /* Single-brand apps can just reuse the existing tokens: */
  --nav-primary: var(--primary);
  --sidebar: var(--background);
}

/* A multi-brand app overrides just these two, per brand: */
[data-brand="acme"] {
  --nav-primary: oklch(0.55 0.2 25);
}
```

### Chart tokens

`KpiCard`'s `donut` variant (and any future multi-series chart in the
package) cycles through six tokens, `--chart-1` through `--chart-6`, so a
proportion breakdown always uses one consistent, brand-tunable palette
instead of picking its own arbitrary colors. Register them the same way:

```css
@theme inline {
  /* ...your existing tokens... */
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-chart-6: var(--chart-6);
}

:root {
  --chart-1: oklch(0.62 0.19 260);
  --chart-2: oklch(0.72 0.19 145);
  --chart-3: oklch(0.75 0.16 70);
  --chart-4: oklch(0.62 0.22 305);
  --chart-5: oklch(0.63 0.24 25);
  --chart-6: oklch(0.7 0.13 200);
}
```

Segments without an explicit `color` fall back to a fixed hex palette if
these tokens aren't registered, so `donut` still renders sensibly either way.

### AI token

`AiMarker` and `ConfidenceIndicator` use one dedicated hue, `--ai`, for AI
provenance — a field a model filled in, a generated summary, a confidence
score. It's kept separate from `--color-primary` and from every status tone
so model output never reads as either brand-authored UI or a human-verified
state (especially the `success`/green tone `StatusBadge` uses for
`approved`/`paid`/`completed`). Register it the same way:

```css
@theme inline {
  /* ...your existing tokens... */
  --color-ai: var(--ai);
}

:root {
  --ai: oklch(0.585 0.2 277); /* indigo-500, ~4.6:1 on white */
}

.dark {
  --ai: oklch(0.72 0.15 277); /* indigo-400 */
}
```

Because this package ships no CSS, both components read the token via the
arbitrary-value-with-fallback form (`bg-[var(--ai,#6366f1)]`) rather than a
`bg-ai`/`text-ai` utility class, so they render sensibly even before you've
registered `--color-ai`.

## What's in the package

- **[Primitives](/ui/primitives)** — base components: `Button`, `Input`,
  `Label`, `Textarea`, `Card`, `Badge`, `Dialog`, `Popover`, `Select`,
  `Skeleton`, `DropdownMenu`, `Sheet`, `Tooltip`.
- **[Patterns](/ui/patterns)** — components composed on top of the
  primitives for a specific recurring shape: `Modal`/`ConfirmDialog`/
  `FormModal`, `FormField`, `AlertBox`, `StatusBadge`,
  `LoadingSpinner`/`LoadingOverlay`, `Combobox`, `Sidebar`/`NavGroup`/
  `NavItem`.

## Try it live

**[Open the interactive demo →](https://bmsuisse.github.io/bmsui/demo/ui/)** — every component above,
rendered together, with a light/dark toggle.
