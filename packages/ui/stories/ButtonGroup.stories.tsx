import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CheckIcon, PlusIcon } from "@heroicons/react/24/outline";
import { ButtonGroup } from "@bmsuisse/ui";

const meta: Meta<typeof ButtonGroup> = {
  title: "Patterns/ButtonGroup",
  component: ButtonGroup,
  args: {
    value: "create",
    onValueChange: () => {},
    "aria-label": "Action",
    options: [{ value: "ignore", label: "Ignore" }, { value: "create", label: "Create" }, { value: "update", label: "Update" }],
  },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <ButtonGroup {...args} value={value} onValueChange={setValue} />;
  },
};
export default meta;
type Story = StoryObj<typeof ButtonGroup>;

export const Default: Story = {};
export const Small: Story = { args: { size: "sm" } };
export const WithIcons: Story = {
  args: { value: "create", options: [{ value: "create", label: "Create", icon: PlusIcon }, { value: "update", label: "Update", icon: CheckIcon }] },
};
export const Disabled: Story = { args: { disabled: true } };
