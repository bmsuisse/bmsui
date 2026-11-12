# @bmsuisse/ui

Shared shadcn/ui-based React primitives and composed UI patterns: `Modal`,
`ConfirmDialog`, `FormModal`, `FormField`, `AlertBox`, `StatusBadge`,
`LoadingSpinner`/`LoadingOverlay`, `Combobox`, plus base primitives
(`Button`, `Input`, `Dialog`, `Popover`, `Select`, `Sheet`, `Tooltip`, …).

## Install

```
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

See [AGENTS.md](../../AGENTS.md) for the full design rationale, and
`packages/ui/demo` for a runnable example of every component. Browse the
components interactively (controls, light/dark, accessibility check) in the
[Storybook](https://bmsuisse.github.io/bmsui/storybook/), or run it locally with
`bun run storybook`.

## License

[MIT](LICENSE)
