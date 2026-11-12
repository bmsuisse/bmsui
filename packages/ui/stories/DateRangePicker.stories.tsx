import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DateRangePicker, type DateRange } from "@bmsuisse/ui";

const meta: Meta<typeof DateRangePicker> = {
  title: "Patterns/DateRangePicker",
  component: DateRangePicker,
  args: { value: { from: "2026-11-01", to: "2026-11-12" }, onValueChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState<DateRange>(args.value);
    return <DateRangePicker {...args} value={value} onValueChange={setValue} />;
  },
};
export default meta;
type Story = StoryObj<typeof DateRangePicker>;

export const Default: Story = {};
export const Empty: Story = { args: { value: { from: "", to: "" } } };
export const Small: Story = { args: { size: "sm" } };
export const WithMinMax: Story = { args: { min: "2026-10-15", max: "2026-12-15" } };
export const Disabled: Story = { args: { disabled: true } };
