import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TreeSelect, type TreeSelectNode } from "@bmsuisse/ui";

const nodes: TreeSelectNode[] = [
  { value: "ch", label: "Switzerland", children: [
    { value: "west", label: "West", children: [
      { value: "lausanne", label: "Lausanne", children: [] },
      { value: "geneva", label: "Geneva", children: [] },
    ] },
    { value: "east", label: "East", children: [{ value: "zurich", label: "Zurich", children: [] }] },
  ] },
];

const meta = { title: "Patterns/TreeSelect", component: TreeSelect, parameters: { layout: "padded" } } satisfies Meta<typeof TreeSelect>;
export default meta;
type Story = StoryObj;

export const BusinessUnits: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>("lausanne");
    return <div className="w-80"><TreeSelect nodes={nodes} value={value} onChange={setValue} placeholder="Business unit" /></div>;
  },
};

export const Empty: Story = { render: () => <TreeSelect nodes={[]} value={null} onChange={() => {}} /> };
export const Loading: Story = { render: () => <TreeSelect nodes={[]} value={null} onChange={() => {}} loading /> };
export const Failed: Story = { render: () => <TreeSelect nodes={[]} value={null} onChange={() => {}} errorMessage="Could not load business units" onRetry={() => {}} /> };
