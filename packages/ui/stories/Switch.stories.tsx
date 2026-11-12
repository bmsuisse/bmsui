import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Label, Switch } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Switch" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [on, setOn] = useState(false);
    return (
      <div className="flex items-center gap-2">
        <Switch id="s1" checked={on} onCheckedChange={setOn} />
        <Label htmlFor="s1">{on ? "On" : "Off"}</Label>
      </div>
    );
  },
};
export const Small: Story = { render: () => <Switch size="sm" defaultChecked aria-label="Small" /> };
export const Disabled: Story = {
  render: () => (
    <div className="flex gap-3">
      <Switch disabled aria-label="Off" />
      <Switch disabled defaultChecked aria-label="On" />
    </div>
  ),
};
