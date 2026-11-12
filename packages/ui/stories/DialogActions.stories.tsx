import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, DialogActions } from "@bmsuisse/ui";

const meta: Meta = { title: "Patterns/DialogActions" };
export default meta;
type Story = StoryObj;

/** Cancel goes where the platform puts it (right on Windows, left elsewhere); the primary action stays furthest from it. */
export const SaveChanges: Story = {
  render: () => (
    <div className="flex items-center gap-2 rounded-md border border-foreground/10 p-3 dark:border-border">
      <DialogActions
        actions={[<Button key="discard" variant="outline">Don't save</Button>, <Button key="save">Save</Button>]}
        cancel={<Button variant="ghost">Cancel</Button>}
      />
    </div>
  ),
};
