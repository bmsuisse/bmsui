import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@bmsuisse/ui";

const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Save" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Delete" } };
export const Disabled: Story = { args: { disabled: true } };
