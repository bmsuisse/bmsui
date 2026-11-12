import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusBadge } from "@bmsuisse/ui";

const meta = {
  title: "Patterns/StatusBadge",
  component: StatusBadge,
  args: { status: "approved" },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Approved: Story = {};
export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {["approved", "pending", "rejected", "new", "archived"].map((status) => (
        <StatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};
export const CustomToneMap: Story = {
  args: { status: "shipped", toneMap: { shipped: "info" } },
};
