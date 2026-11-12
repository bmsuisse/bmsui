import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { type Facet, FacetFilter, FilterSheet, FilterSheetTrigger, type FacetFilterValue, countActiveFilters } from "@bmsuisse/ui";

const facets: Facet[] = [
  { key: "supplier", label: "Supplier", options: [{ value: "acme", label: "Acme AG", count: 42 }, { value: "bolt", label: "Bolt GmbH", count: 17 }] },
  { key: "own", label: "Own brand", type: "boolean", options: [{ value: "true", count: 310 }] },
];

const meta = {
  title: "Patterns/FilterSheet",
  component: FilterSheet,
  args: { open: false, onOpenChange: () => {}, children: null },
} satisfies Meta<typeof FilterSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Draft selection is kept by the caller and committed on Apply. */
export const WithApply: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [applied, setApplied] = useState<FacetFilterValue>({});
    const [draft, setDraft] = useState<FacetFilterValue>({});
    return (
      <>
        <FilterSheetTrigger
          activeCount={countActiveFilters(applied)}
          onClick={() => {
            setDraft(applied);
            setOpen(true);
          }}
        />
        <FilterSheet
          open={open}
          onOpenChange={setOpen}
          activeCount={countActiveFilters(draft)}
          onApply={() => setApplied(draft)}
          onReset={() => setDraft({})}
        >
          <FacetFilter facets={facets} value={draft} onValueChange={setDraft} showReset={false} />
        </FilterSheet>
      </>
    );
  },
};

/** Without `onApply` filters take effect as they change. */
export const Live: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState<FacetFilterValue>({});
    return (
      <>
        <FilterSheetTrigger activeCount={countActiveFilters(value)} onClick={() => setOpen(true)} />
        <FilterSheet open={open} onOpenChange={setOpen} activeCount={countActiveFilters(value)} onReset={() => setValue({})}>
          <FacetFilter facets={facets} value={value} onValueChange={setValue} showReset={false} />
        </FilterSheet>
      </>
    );
  },
};
