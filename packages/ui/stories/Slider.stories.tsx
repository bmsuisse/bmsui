import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Slider } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Slider" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [v, setV] = useState([40]);
    return (
      <div className="w-64 space-y-2">
        <Slider value={v} onValueChange={setV} max={100} step={1} />
        <p className="text-sm text-muted-foreground">Value: {v[0]}</p>
      </div>
    );
  },
};
export const Range: Story = {
  render: () => {
    const [v, setV] = useState([20, 70]);
    return (
      <div className="w-64 space-y-2">
        <Slider value={v} onValueChange={setV} max={100} />
        <p className="text-sm text-muted-foreground">{v[0]} to {v[1]}</p>
      </div>
    );
  },
};
export const Disabled: Story = { render: () => <Slider className="w-64" defaultValue={[30]} disabled /> };
export const Vertical: Story = {
  render: () => <div className="h-40"><Slider orientation="vertical" defaultValue={[50]} /></div>,
};
