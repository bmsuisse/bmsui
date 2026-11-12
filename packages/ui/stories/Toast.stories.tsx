import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Toaster, toast } from "@bmsuisse/ui";

const meta: Meta<typeof Toaster> = {
  title: "Patterns/Toast",
  component: Toaster,
  decorators: [
    (Story) => (
      <>
        <Story />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success("Saved")}>Success</Button>
          <Button variant="outline" onClick={() => toast.error("Could not save", { description: "Try again." })}>Error</Button>
          <Button variant="outline" onClick={() => toast.info("Offer sent", { action: { label: "Undo", onClick: () => {} } })}>With action</Button>
        </div>
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Toaster>;

export const Default: Story = {};
