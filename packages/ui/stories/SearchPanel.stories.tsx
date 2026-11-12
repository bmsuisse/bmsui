import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { SearchPanel, SearchTrigger } from "@bmsuisse/ui";

const meta: Meta<typeof SearchPanel> = {
  title: "Patterns/SearchPanel",
  component: SearchPanel,
  args: { value: "", onChange: () => {}, placeholder: "Customers, visits, places...", shortcutHint: "Ctrl K" },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div className="w-[420px]">
        <SearchPanel {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};
export default meta;
type Story = StoryObj<typeof SearchPanel>;

export const Default: Story = {};
export const Loading: Story = { args: { value: "mey", loading: true } };
export const WithError: Story = { args: { value: "mey", error: "Search failed.", onRetry: () => {} } };
export const WithModes: Story = {
  args: {
    modes: [{ key: "all", label: "All" }, { key: "customers", label: "Customers" }, { key: "products", label: "Products" }],
    activeMode: "all",
  },
  render: (args) => {
    const [value, setValue] = useState("");
    const [mode, setMode] = useState("all");
    return (
      <div className="w-[420px]">
        <SearchPanel {...args} value={value} onChange={setValue} activeMode={mode} onModeChange={setMode} />
      </div>
    );
  },
};
export const WithTrailingSlot: Story = {
  args: {
    trailingSlot: (
      <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Voice search">
        <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    ),
  },
};
export const Trigger: Story = { render: () => <SearchTrigger onClick={() => {}} /> };
