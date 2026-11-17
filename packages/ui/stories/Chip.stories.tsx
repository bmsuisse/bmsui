import { useState } from "react";
import { MapPinIcon, ChartBarIcon } from "@heroicons/react/16/solid";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip } from "@bmsuisse/ui";

const meta: Meta<typeof Chip> = { title: "Patterns/Chip", component: Chip, args: { children: "Zürich" } };

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {};
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <Chip>Neutral</Chip>
      <Chip selected>Selected</Chip>
      <Chip tone="primary">Primary</Chip>
      <Chip dashed>Dashed</Chip>
      <Chip icon={<MapPinIcon />}>With icon</Chip>
      <Chip disabled onClick={() => {}}>Disabled</Chip>
    </div>
  ),
};
export const Small: Story = {
  render: () => (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <Chip size="sm">KI-Illustration</Chip>
      <Chip size="sm" selected>Selected</Chip>
      <Chip size="sm" dashed icon={<MapPinIcon />}>Dashed</Chip>
      <Chip size="sm" onRemove={() => {}}>Removable</Chip>
    </div>
  ),
};
export const Toggle: Story = {
  render: () => {
    const [on, setOn] = useState(false);
    return (
      <Chip icon={<ChartBarIcon />} selected={on} onClick={() => setOn(!on)}>
        Show charts
      </Chip>
    );
  },
};
export const Removable: Story = {
  render: () => {
    const [items, setItems] = useState(["Zürich", "Bern", "Basel", "A very long customer name that has to truncate somewhere"]);
    return (
      <div className="flex max-w-full flex-wrap gap-2">
        {items.map((item) => (
          <Chip key={item} className="max-w-full" tone="primary" onRemove={() => setItems(items.filter((i) => i !== item))}>
            {item}
          </Chip>
        ))}
        {items.length === 0 ? <span className="text-sm text-muted-foreground">All removed. Reload the story.</span> : null}
      </div>
    );
  },
};
export const LabelsOverride: Story = {
  render: () => (
    <Chip onRemove={() => {}} labels={{ remove: "Entfernen" }}>
      Luzern
    </Chip>
  ),
};
