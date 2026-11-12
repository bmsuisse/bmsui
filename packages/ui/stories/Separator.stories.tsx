import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "@bmsuisse/ui";

const meta: Meta<typeof Separator> = { title: "Primitives/Separator", component: Separator };
export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64 text-sm">
      <p>Above</p>
      <Separator className="my-3" />
      <p className="text-muted-foreground">Below</p>
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center gap-3 text-sm">
      <span>Home</span>
      <Separator orientation="vertical" />
      <span>Offers</span>
      <Separator orientation="vertical" />
      <span>Customers</span>
    </div>
  ),
};
