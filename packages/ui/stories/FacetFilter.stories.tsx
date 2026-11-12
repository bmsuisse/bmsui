import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ActiveFacets, type FacetDefinition, FacetFilter, FacetFilterSkeleton, type FacetFilterValue } from "@bmsuisse/ui";

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

/** Fold-away headings with a selected-count badge, a radio facet and a dimmed zero-count option. */
export const CollapsibleAndSingle: Story = {
  args: {
    collapsible: true,
    value: { category: ["Safety"] },
    facets: [
      { key: "sort", label: "Sort by", type: "single", options: [{ value: "rel", label: "Relevance", count: 128 }, { value: "price", label: "Price", count: 128 }] },
      { ...facets[0]!, defaultCollapsed: true },
      { key: "brand", label: "Brand", defaultCollapsed: true, options: [{ value: "a", label: "Acme", count: 12 }, { value: "b", label: "Bolt", count: 0 }] },
    ],
  },
};

export const Loading: Story = {
  render: () => (
    <div className="w-72">
      <FacetFilterSkeleton />
    </div>
  ),
};

/** Different data types in one filter: list, search, price range with histogram, quantity range, date range. */
export const DataTypes: Story = {
  args: {
    collapsible: true,
    value: { price: ["20..80"] },
    facets: [
      facets[0]!,
      { key: "price", label: "Price", type: "range", range: { min: 0, max: 200, unit: "CHF", histogram: [3, 9, 14, 11, 7, 4, 3, 2, 1, 1, 0, 2] } },
      { key: "pack", label: "Pack size", type: "range", range: { min: 1, max: 5 } },
      { key: "created", label: "Listed since", type: "dateRange", dateRange: { locale: "de-CH" } },
    ],
  },
};
