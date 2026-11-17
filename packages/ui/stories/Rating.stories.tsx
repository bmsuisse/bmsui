import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Rating } from "@bmsuisse/ui";

const meta: Meta<typeof Rating> = {
  title: "Patterns/Rating",
  component: Rating,
  args: { value: 3, "aria-label": "Quality" },
  render: (args) => {
    const [value, setValue] = useState(args.value ?? 0);
    return <Rating {...args} value={value} onValueChange={setValue} />;
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: 0 } };
export const HalfStars: Story = { args: { value: 3.5, allowHalf: true } };
export const AllowClear: Story = { args: { value: 2, allowClear: true } };
export const TenStars: Story = { args: { value: 7, max: 10, size: "sm" } };
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Rating size="sm" defaultValue={3} aria-label="Small" />
      <Rating size="md" defaultValue={3} aria-label="Medium" />
      <Rating size="lg" defaultValue={3} aria-label="Large" />
    </div>
  ),
};
export const ReadOnlyAverage: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Rating readOnly allowHalf value={4.5} aria-label="Average rating" />
      <span className="text-sm text-muted-foreground">4.5 (128 reviews)</span>
    </div>
  ),
};
export const ReadOnlyUnrated: Story = { render: () => <Rating readOnly value={0} /> };
export const Disabled: Story = { args: { value: 2, disabled: true } };
export const German: Story = {
  args: {
    value: 4,
    labels: {
      rating: "Bewertung",
      star: (v, m) => `${v} von ${m} Sternen`,
      valueText: (v, m) => `${v} von ${m}`,
      unrated: "Nicht bewertet",
    },
  },
};
export const NarrowContainer: Story = {
  render: () => (
    <div className="w-40 max-w-full rounded-md border border-foreground/10 p-2 dark:border-border">
      <Rating max={10} size="sm" defaultValue={6} aria-label="Ten star rating" className="flex-wrap" />
    </div>
  ),
};
