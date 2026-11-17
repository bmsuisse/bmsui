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

In dark mode point `--nav-primary` at a light accent such as `--ring`
(`html.dark { --nav-primary: var(--ring); }`), because `--primary` stays navy
(~2:1 on dark surfaces) and the active-row tint and label would vanish.

### Using @bmsuisse/ui with multiple brands (OneSales example)

OneSales is multi-brand: a `data-brand` attribute on `<html>` (`bms`, `proone`,
`procasa`) swaps a handful of tokens per tenant on top of one shared component
set, layered with the usual `.dark` class. Storybook reproduces this with the
"Brand" toolbar control (`packages/ui/.storybook/brands.css`), which makes it
easy to check a brand's tokens against the components in light and dark.

Rules a brand's tokens must follow:

1. White on `--primary` must reach 4.5:1 in both modes (KpiCard hero, the
   default Button).
2. Dark `--ring` is also used as a foreground (`dark:text-ring`, `dark:bg-ring`,
   `dark:stroke-ring`), so it must reach 4.5:1 on `--background`, `--popover`
   and `--muted`. Don't set it equal to a dark `--primary`.
3. Dark `--accent-foreground` must be a dark colour whenever dark `--accent` is
   light or mid.
4. Redefine `--nav-primary` inside each brand's `.dark` block:
   `html[data-brand=x]` has the same specificity as `html.dark` and comes
   later, so the light value otherwise wins in dark mode.
5. `--muted-foreground` must reach 4.5:1 on `--muted` and on `foreground/10`
   tints.
6. `--destructive` is a fill token; the library uses `red-700` / `red-300` for
   error text.

Recommended values for the OneSales brands (contrast, now → after):

| Token | Now | Recommended | Contrast |
|---|---|---|---|
| bms dark `--ring` | `oklch(0.58 0.2 27)` | `oklch(0.68 0.21 27)` | 4.06 → 6.05 |
| bms dark `--nav-primary` | `#dc001a` | `oklch(0.68 0.21 27)` | 3.73 → 6.05 |
| bms dark `--accent-foreground` | light ink | `oklch(0.165 0.022 265)` | 2.74 → 6.05 |
| proone dark `--primary` | `oklch(0.6 0.15 252)` | `oklch(0.53 0.15 252)` | 3.86 → 5.15 |
| proone dark `--ring` | `oklch(0.6 0.15 252)` (= primary) | `oklch(0.72 0.12 252)` | 4.85/4.51/4.10 → 7.83/7.28/6.61 |
| proone dark `--accent-foreground` | light ink | `oklch(0.165 0.022 265)` | 2.86 → 6.55 |
| proone dark `--nav-primary` | `oklch(0.3 0.11 252)` | `oklch(0.72 0.12 252)` | 1.43 → 7.55 |
| procasa dark `--primary` | `oklch(0.63 0.07 47)` | `oklch(0.54 0.07 47)` | 3.48 → 5.02 |
| procasa dark `--ring` | `oklch(0.63 0.07 47)` (= primary) | `oklch(0.75 0.07 47)` | → 8.79/8.29/7.61 |
| procasa dark `--accent-foreground` | light ink | `oklch(0.14 0.008 60)` | 3.44 → 5.62 |
| procasa dark `--nav-primary` | `oklch(0.47 0.07 47)` | `oklch(0.75 0.07 47)` | 2.68 → 8.29 |
| procasa light `--muted-foreground` | `oklch(0.55 0.015 70)` | `oklch(0.46 0.015 70)` | 4.57/4.10/3.70 → 6.66/5.98/5.40 |

### Corner radius (rounded vs square)

Corners come from one token, `--radius`. Register the scale as **multiples** of it (OneSales' scale) so
every step reaches 0, and add `--radius-pill` for pill-shaped controls:

```css
@theme inline {
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.6);
}
:root {
  --radius: 0.625rem;      /* rounded */
  --radius-pill: 9999px;   /* Badge, SearchBar, chips, tracks, Switch, Slider */
}
/* A square theme (or one brand): zero both tokens. */
html[data-corners="square"] { --radius: 0px; --radius-pill: 0px; }
```

At `0.625rem` the multiples are 6 / 8 / 10 / 14 / 16px, the same values as the older `radius ± Npx`
formulas, so switching changes nothing visually. `--radius-pill` is optional: components fall back to
fully round when it is undefined. True circles (`Avatar`, `RadioGroup`, status dots) stay round in a
square theme on purpose. Small fixed corners (`Kbd` keycaps, text link buttons, `Checkbox`) use
`min(4px | 3px, var(--radius))`, so they square off too but never exceed their fixed size. Storybook has
a **Corners** toolbar control (Rounded / Square) that sets `data-corners` on `<html>`.

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
