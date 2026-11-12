import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertBox } from "@bmsuisse/ui";

const meta: Meta<typeof AlertBox> = {
  title: "Patterns/AlertBox",
  component: AlertBox,
  args: { variant: "info", title: "Heads up", children: "Prices are updated every night at 02:00." },
};

export default meta;
type Story = StoryObj<typeof AlertBox>;

export const Default: Story = {};
export const Error: Story = { args: { variant: "error", title: "Save failed", children: "The server rejected the request." } };
export const Warning: Story = { args: { variant: "warning", title: "Stock is low", children: "Only 3 units left." } };
export const Success: Story = { args: { variant: "success", title: "Saved", children: "Your changes were stored." } };
export const AllTones: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <AlertBox variant="error">Error without title</AlertBox>
      <AlertBox variant="warning">Warning without title</AlertBox>
      <AlertBox variant="info">Info without title</AlertBox>
      <AlertBox variant="success">Success without title</AlertBox>
    </div>
  ),
};
