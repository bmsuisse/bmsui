import type { Meta, StoryObj } from "@storybook/react-vite";
import { RankBadge, ScoreBadge } from "@bmsuisse/ui";

const meta = {
  title: "Patterns/ScoreBadge",
  component: ScoreBadge,
  args: { value: 92 },
} satisfies Meta<typeof ScoreBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {};
export const Low: Story = { args: { value: 64 } };
export const ZeroToOneScale: Story = { args: { value: 0.87, max: 1 } };
export const CustomThresholds: Story = {
  args: {
    value: 40,
    thresholds: [
      { min: 70, tone: "success" },
      { min: 30, tone: "warning" },
      { min: 0, tone: "error" },
    ],
  },
};
export const Small: Story = { args: { size: "sm" } };
export const Ranks: Story = {
  render: () => (
    <div className="flex gap-2">
      <RankBadge rank={1} />
      <RankBadge rank={2} />
      <RankBadge rank={12} />
    </div>
  ),
};
