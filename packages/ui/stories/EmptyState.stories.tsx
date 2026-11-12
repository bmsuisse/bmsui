import { InboxIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, EmptyState, FilteredEmptyState } from "@bmsuisse/ui";

const meta = {
  title: "Patterns/EmptyState",
  component: EmptyState,
  args: { title: "No offers yet", description: "Offers you create will show up here.", icon: InboxIcon },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { action: <Button>New offer</Button> } };
export const Small: Story = { args: { size: "sm" } };
export const Filtered: Story = {
  render: () => <FilteredEmptyState onReset={() => {}} />,
};
