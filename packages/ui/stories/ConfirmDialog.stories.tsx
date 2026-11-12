import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, ConfirmDialog } from "@bmsuisse/ui";

const meta = {
  title: "Patterns/ConfirmDialog",
  component: ConfirmDialog,
  args: { open: false, onOpenChange: () => {}, title: "Delete offer?", onConfirm: () => {} },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>Delete…</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete offer?"
          description="This can't be undone."
          confirmLabel="Delete"
          onConfirm={() => new Promise((resolve) => setTimeout(resolve, 600))}
        />
      </>
    );
  },
};
