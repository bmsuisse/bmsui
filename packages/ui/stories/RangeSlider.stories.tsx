import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RangeSlider } from "@bmsuisse/ui";

const meta: Meta<typeof RangeSlider> = {
  title: "Patterns/RangeSlider",
  component: RangeSlider,
  args: { value: [1200, 8500], onValueChange: () => {}, min: 0, max: 10000, step: 100 },
  render: (args) => {
    const [value, setValue] = useState<[number, number]>(args.value);
    return (
      <div className="w-80">
        <RangeSlider {...args} value={value} onValueChange={setValue} />
      </div>
    );
  },
};
export default meta;
type Story = StoryObj<typeof RangeSlider>;

export const Default: Story = {};
export const WithUnit: Story = { args: { unit: "CHF" } };
export const MinGap: Story = { args: { minStepsBetween: 10 } };
export const Disabled: Story = { args: { disabled: true } };
