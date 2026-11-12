import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, AvatarGroup } from "@bmsuisse/ui";

const meta: Meta<typeof Avatar> = {
  title: "Patterns/Avatar",
  component: Avatar,
  args: { name: "Anna Muster" },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {};
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => <Avatar key={s} name="Anna Muster" size={s} />)}
    </div>
  ),
};
export const WithStatus: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar name="Anna Muster" size="lg" status="success" />
      <Avatar name="Ben Beispiel" size="lg" status="warning" />
      <Avatar name="Carla Probe" size="lg" status="error" shape="square" />
      <Avatar name="Dino Test" size="lg" status="neutral" />
    </div>
  ),
};
export const Group: Story = {
  render: () => (
    <AvatarGroup
      max={4}
      items={[
        { name: "Anna Muster" }, { name: "Ben Beispiel", status: "success" }, { name: "Carla Probe" },
        { name: "Dino Test" }, { name: "Eva Example" }, { name: "Felix Fixture" },
      ]}
    />
  ),
};
