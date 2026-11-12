import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TagCombobox } from "@bmsuisse/ui";

const colors = ["Red", "Blue", "Green", "Yellow", "Purple"].map((l) => ({ value: l.toLowerCase(), label: l }));

const meta: Meta<typeof TagCombobox> = {
  title: "Patterns/TagCombobox",
  component: TagCombobox,
  args: { options: colors, value: ["red", "blue"], onChange: () => {}, placeholder: "Add a color..." },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div className="w-96">
        <TagCombobox {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};
export default meta;
type Story = StoryObj<typeof TagCombobox>;

export const Default: Story = {};
export const Empty: Story = { args: { value: [] } };
export const Grouped: Story = {
  args: {
    value: [],
    groupLabels: { "team-a": "Team A", "team-b": "Team B" },
    options: [
      { value: "alice", label: "Alice", group: "team-a" },
      { value: "andrew", label: "Andrew", group: "team-a" },
      { value: "carol", label: "Carol", group: "team-b" },
      { value: "cyrus", label: "Cyrus", group: "team-b" },
      { value: "eve", label: "Eve" },
    ],
  },
};
export const Loading: Story = { args: { loading: true, value: [] } };
export const Error: Story = { args: { error: "Could not load suppliers.", onRetry: () => {}, value: [] } };
export const Disabled: Story = { args: { disabled: true } };
