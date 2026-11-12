import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input, Label } from "@bmsuisse/ui";

const meta: Meta<typeof Label> = { title: "Primitives/Label", component: Label, args: { children: "Label" } };
export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {};
export const WithInput: Story = {
  render: () => (
    <div className="grid w-64 gap-1.5">
      <Label htmlFor="l1">Name</Label>
      <Input id="l1" />
    </div>
  ),
};
export const Required: Story = {
  render: () => <Label>Name <span className="text-destructive">*</span></Label>,
};
