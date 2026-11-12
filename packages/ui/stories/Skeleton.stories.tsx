import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "@bmsuisse/ui";

const meta: Meta<typeof Skeleton> = { title: "Primitives/Skeleton", component: Skeleton };
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = { args: { className: "h-4 w-48" } };
export const Card: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Skeleton className="size-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  ),
};
export const Paragraph: Story = {
  render: () => (
    <div className="w-72 space-y-2">
      {[100, 90, 95, 60].map((w, i) => <Skeleton key={i} className="h-3" style={{ width: w + "%" }} />)}
    </div>
  ),
};
