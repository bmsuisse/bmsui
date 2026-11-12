import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DateInput } from "@bmsuisse/ui";

const meta = {
  title: "Patterns/DateInput",
  component: DateInput,
  args: { value: "2026-11-12", onValueChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div className="w-56">
        <DateInput {...args} value={value} onValueChange={setValue} />
      </div>
    );
  },
} satisfies Meta<typeof DateInput>;


export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: "" } };
export const WithMinMax: Story = { args: { min: "2026-11-01", max: "2026-11-30" } };
