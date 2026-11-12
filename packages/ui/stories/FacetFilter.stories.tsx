import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ActiveFacets, type FacetDefinition, FacetFilter, type FacetFilterValue } from "@bmsuisse/ui";

const facets: FacetDefinition[] = [
  {
    key: "category",
    label: "Category",
    options: ["Power tools", "Hand tools", "Fasteners", "Abrasives", "Safety", "Measuring", "Storage", "Lighting", "Cleaning", "Other"].map(
      (label, i) => ({ value: label, count: 1200 - i * 97 }),
    ),
  },
  { key: "supplier", label: "Supplier", searchable: true, options: [{ value: "acme", label: "Acme AG", count: 42 }, { value: "bolt", label: "Bolt GmbH", count: 17 }] },
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

/** Applied filters as chips above a result list; share `value` with the sidebar. */
export const WithActiveChips: Story = {
  args: { value: { category: ["Other", "Safety"], supplier: ["acme"] } },
  render: (args) => {
    const [value, setValue] = useState<FacetFilterValue>(args.value);
    return (
      <div className="w-80 space-y-4">
        <ActiveFacets facets={facets} value={value} onValueChange={setValue} />
        <FacetFilter {...args} value={value} onValueChange={setValue} />
      </div>
    );
  },
};
