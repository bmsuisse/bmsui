import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ListBulletIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { SegmentedControl } from "@bmsuisse/ui";

const meta: Meta<typeof SegmentedControl> = {
  title: "Patterns/SegmentedControl",
  component: SegmentedControl,
  args: {
    value: "week",
    onValueChange: () => {},
    "aria-label": "Range",
    options: [
      { value: "day", label: "Day" },
      { value: "week", label: "Week" },
      { value: "month", label: "Month" },
    ],
  },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <SegmentedControl {...args} value={value} onValueChange={setValue} />;
  },
};
export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const Default: Story = {};
export const Small: Story = { args: { size: "sm" } };
export const FullWidth: Story = { args: { fullWidth: true } };
export const WithIcons: Story = {
  args: {
    value: "list",
    options: [
      { value: "list", label: "List", icon: ListBulletIcon },
      { value: "grid", label: "Grid", icon: Squares2X2Icon },
    ],
  },
};
export const DisabledOption: Story = {
  args: { options: [{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month", disabled: true }] },
};
export const Disabled: Story = { args: { disabled: true } };
