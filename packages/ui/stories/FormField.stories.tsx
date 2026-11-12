import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField, Input } from "@bmsuisse/ui";

const meta: Meta<typeof FormField> = {
  title: "Patterns/FormField",
  component: FormField,
  args: { label: "Email", children: <Input placeholder="name@company.ch" /> },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {};
export const WithDescription: Story = { args: { description: "We only use this for order confirmations." } };
export const Required: Story = { args: { required: true } };
export const WithError: Story = {
  args: { error: "Enter a valid email address.", children: <Input defaultValue="not-an-email" /> },
};
