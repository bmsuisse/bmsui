import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Label, RadioGroup, RadioGroupItem } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/RadioGroup" };
export default meta;
type Story = StoryObj;

const items: [string, string][] = [["a", "Standard"], ["b", "Express"], ["c", "Pickup"]];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("a");
    return (
      <RadioGroup value={value} onValueChange={setValue}>
        {items.map(([v, l]) => (
          <div key={v} className="flex items-center gap-2">
            <RadioGroupItem value={v} id={"r-" + v} />
            <Label htmlFor={"r-" + v}>{l}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  },
};
export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="a" disabled>
      {items.map(([v, l]) => (
        <div key={v} className="flex items-center gap-2">
          <RadioGroupItem value={v} id={"d-" + v} />
          <Label htmlFor={"d-" + v}>{l}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};
export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="a" className="flex gap-4">
      {items.map(([v, l]) => (
        <div key={v} className="flex items-center gap-2">
          <RadioGroupItem value={v} id={"h-" + v} />
          <Label htmlFor={"h-" + v}>{l}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};
