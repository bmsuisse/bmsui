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

## What's in the package

- **[Primitives](/ui/primitives)** — base components: `Button`, `Input`,
  `Label`, `Textarea`, `Card`, `Badge`, `Dialog`, `Popover`, `Select`,
  `Skeleton`, `DropdownMenu`, `Sheet`, `Tooltip`.
- **[Patterns](/ui/patterns)** — components composed on top of the
  primitives for a specific recurring shape: `Modal`/`ConfirmDialog`/
  `FormModal`, `FormField`, `AlertBox`, `StatusBadge`,
  `LoadingSpinner`/`LoadingOverlay`, `Combobox`.

## Try it live

**[Open the interactive demo →](https://bmsuisse.github.io/bmsui/demo/ui/)** — every component above,
rendered together, with a light/dark toggle.
