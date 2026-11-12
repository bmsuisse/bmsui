import type { Meta, StoryObj } from "@storybook/react-vite";
import { Timestamp } from "@bmsuisse/ui";

const FIXED = new Date("2026-03-14T09:30:00Z");

const meta: Meta<typeof Timestamp> = { title: "Patterns/Timestamp", component: Timestamp, args: { value: FIXED } };

export default meta;
type Story = StoryObj<typeof Timestamp>;

export const Default: Story = { args: { format: "datetime" } };
export const Formats: Story = {
  render: () => (
    <div className="flex flex-col gap-2 text-sm">
      <Timestamp value={FIXED} format="date" />
      <Timestamp value={FIXED} format="datetime" />
      <Timestamp value={FIXED} format="time" />
      <Timestamp value={FIXED} format="relative" />
    </div>
  ),
};
export const Relative: Story = { args: { format: "relative", relativeStyle: "short", live: false } };
export const Invalid: Story = { args: { value: "not-a-date", invalidLabel: "Unknown date" } };
