import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { NumberInput } from "@bmsuisse/ui";

const meta: Meta<typeof NumberInput> = {
  title: "Patterns/NumberInput",
  component: NumberInput,
  args: { value: 1234.5, onValueChange: () => {}, decimals: 2 },
  render: (args) => {
    const [value, setValue] = useState<number | null>(args.value);
    return (
      <div className="w-48">
        <NumberInput {...args} value={value} onValueChange={setValue} />
      </div>
    );
  },
};
export default meta;
type Story = StoryObj<typeof NumberInput>;

export const Default: Story = {};
export const StepperWithMinMax: Story = { args: { value: 3, decimals: 0, min: 0, max: 10, stepper: true } };
export const Small: Story = { args: { size: "sm", stepper: true, step: 0.5, value: null, placeholder: "0.0" } };
export const Currency: Story = { args: { formatOptions: { style: "currency", currency: "CHF" } } };
export const Disabled: Story = { args: { disabled: true, stepper: true } };
