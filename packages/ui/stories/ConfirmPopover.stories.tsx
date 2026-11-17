import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, ConfirmPopover } from "@bmsuisse/ui";

const meta: Meta<typeof ConfirmPopover> = {
  title: "Patterns/ConfirmPopover",
  component: ConfirmPopover,
  args: {
    trigger: <Button variant="outline">Delete draft</Button>,
    message: "Delete this draft? This cannot be undone.",
    confirmLabel: "Delete",
    onConfirm: () => {},
  },
  decorators: [(Story) => <div className="flex min-h-48 items-start justify-end"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof ConfirmPopover>;

export const Default: Story = {};
export const DefaultTone: Story = { args: { tone: "default", message: "Publish this version to all users?", confirmLabel: "Publish", trigger: <Button>Publish</Button> } };
export const OpenOnTop: Story = { args: { defaultOpen: true, side: "bottom" } };
export const Pending: Story = { args: { defaultOpen: true, pending: true } };
export const LabelsOverride: Story = { args: { defaultOpen: true, labels: { confirm: "Löschen", keep: "Behalten" }, message: "Entwurf löschen?" } };
export const AsyncConfirm: Story = {
  render: (args) => {
    const [done, setDone] = useState(false);
    return (
      <div className="flex items-center gap-3">
        <ConfirmPopover
          {...args}
          onConfirm={() => new Promise<void>((resolve) => setTimeout(() => { setDone(true); resolve(); }, 800))}
        />
        {done ? <span className="text-sm text-muted-foreground">Deleted.</span> : null}
      </div>
    );
  },
};
