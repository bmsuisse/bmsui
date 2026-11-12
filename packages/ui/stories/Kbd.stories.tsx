import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, Kbd, KeyCombo, ShortcutSheet } from "@bmsuisse/ui";

const meta: Meta = { title: "Patterns/Kbd", component: Kbd };

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Kbd>K</Kbd>
      <Kbd size="sm">Esc</Kbd>
      <Kbd pressed>Enter</Kbd>
    </div>
  ),
};
export const Combos: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <KeyCombo mac keys="Mod+K" />
      <KeyCombo mac={false} keys="Mod+Shift+P" />
      <KeyCombo keys={["g", "i"]} />
      <KeyCombo mac keys="Alt+ArrowUp" size="sm" />
    </div>
  ),
};
export const Sheet: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>Show shortcuts</Button>
        <ShortcutSheet
          open={open}
          onOpenChange={setOpen}
          mac
          groups={[
            { title: "General", items: [{ label: "Command palette", keys: "Mod+K" }, { label: "Close dialog", keys: "Escape" }] },
            { title: "Navigation", hint: "Press in sequence", items: [{ label: "Go to inbox", keys: ["g", "i"] }, { label: "Go to tasks", keys: ["g", "t"] }] },
          ]}
        />
      </>
    );
  },
};
