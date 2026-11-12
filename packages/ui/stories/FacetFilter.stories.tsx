import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { type FacetDefinition, FacetFilter, type FacetFilterValue } from "@bmsuisse/ui";

const facets: FacetDefinition[] = [
  {
    key: "category",
    label: "Category",
    options: ["Power tools", "Hand tools", "Fasteners", "Abrasives", "Safety", "Measuring", "Storage", "Lighting", "Cleaning", "Other"].map(
      (label, i) => ({ value: label, count: 1200 - i * 97 }),
    ),
  },
  { key: "supplier", label: "Supplier", options: [{ value: "acme", label: "Acme AG", count: 42 }, { value: "bolt", label: "Bolt GmbH", count: 17 }] },
  { key: "own", label: "Own brand", type: "boolean", options: [{ value: "true", count: 310 }] },
];

const meta = {
  title: "Patterns/FacetFilter",
  component: FacetFilter,
  parameters: { layout: "padded" },
  args: { facets, value: {}, onValueChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState<FacetFilterValue>(args.value);
    return (
      <div className="w-72">
        <FacetFilter {...args} value={value} onValueChange={setValue} />
      </div>
    );
  },
} satisfies Meta<typeof FacetFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Preselected: Story = { args: { value: { category: ["Other"], own: ["true"] } } };
export const German: Story = {
  args: { labels: { showMore: (n) => `${n} weitere anzeigen`, showLess: "Weniger", reset: "Filter zurücksetzen" } },
};
