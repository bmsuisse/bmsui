import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox, Label } from "@bmsuisse/ui";

const meta: Meta<typeof Checkbox> = { title: "Primitives/Checkbox", component: Checkbox };
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex items-center gap-2">
        <Checkbox id="c1" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
        <Label htmlFor="c1">Accept terms</Label>
      </div>
    );
  },
};
export const Indeterminate: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="c2" checked="indeterminate" />
      <Label htmlFor="c2">Some selected</Label>
    </div>
  ),
};
export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Checkbox disabled aria-label="Disabled" />
      <Checkbox disabled checked aria-label="Disabled checked" />
    </div>
  ),
};
