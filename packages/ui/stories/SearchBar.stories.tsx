import { CameraIcon, MicrophoneIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, SearchBar } from "@bmsuisse/ui";

const meta = {
  title: "Patterns/SearchBar",
  component: SearchBar,
  args: { value: "", onChange: () => {}, placeholder: "Search products…" },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div className="w-96">
        <SearchBar {...args} value={value} onChange={setValue} />
      </div>
    );
  },
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { value: "drill", loading: true } };
export const WithError: Story = { args: { value: "drill", error: "Search failed", onRetry: () => {} } };
export const WithActions: Story = {
  args: {
    actions: (
      <>
        <Button variant="ghost" size="icon-sm" aria-label="Search by image"><CameraIcon /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Voice input"><MicrophoneIcon /></Button>
      </>
    ),
  },
};
