import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label, Textarea } from "@bmsuisse/ui";

const meta: Meta<typeof Textarea> = { title: "Primitives/Textarea", component: Textarea, args: { placeholder: "Write a note" } };
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};
export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-80 gap-1.5">
      <Label htmlFor="t1">Comment</Label>
      <Textarea id="t1" {...args} />
    </div>
  ),
};
export const Disabled: Story = { args: { disabled: true, value: "Read only" } };
export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "Too short" } };
