import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RadioList } from "@bmsuisse/ui";

const options = [
  { value: "standard", label: "Standard", description: "3-5 working days, free" },
  { value: "express", label: "Express", description: "Next working day, CHF 12.-" },
  { value: "pickup", label: "Pick-up", description: "Not available", disabled: true },
];

const meta: Meta<typeof RadioList> = {
  title: "Patterns/RadioList",
  component: RadioList,
  args: { options, value: "standard", onValueChange: () => {}, "aria-label": "Shipping" },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <RadioList {...args} value={value} onValueChange={setValue} />;
  },
};
export default meta;
type Story = StoryObj<typeof RadioList>;

export const Default: Story = {};
export const Card: Story = { args: { variant: "card" } };
export const HorizontalCards: Story = { args: { variant: "card", orientation: "horizontal" } };
export const Disabled: Story = { args: { disabled: true } };
