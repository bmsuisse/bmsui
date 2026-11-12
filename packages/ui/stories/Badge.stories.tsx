import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@bmsuisse/ui";

const meta: Meta<typeof Badge> = { title: "Primitives/Badge", component: Badge, args: { children: "Badge" } };
export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Destructive: Story = { args: { variant: "destructive" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Warning: Story = { args: { variant: "warning" } };
