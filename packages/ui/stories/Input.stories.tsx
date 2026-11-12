import type { Meta, StoryObj } from "@storybook/react-vite";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Input, Label } from "@bmsuisse/ui";

const meta: Meta<typeof Input> = { title: "Primitives/Input", component: Input, args: { placeholder: "Type here" } };
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-72 gap-1.5">
      <Label htmlFor="i1">Email</Label>
      <Input id="i1" type="email" {...args} />
    </div>
  ),
};
export const Disabled: Story = { args: { disabled: true, value: "Read only" } };
export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "not an email" } };
export const File: Story = { args: { type: "file" } };
export const WithIcon: Story = {
  render: (args) => (
    <div className="relative w-72">
      <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input className="pl-8" {...args} />
    </div>
  ),
};
