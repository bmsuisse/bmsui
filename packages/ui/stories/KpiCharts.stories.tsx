import type { Meta, StoryObj } from "@storybook/react-vite";
import { DonutChart, Sparkline } from "@bmsuisse/ui";

const meta: Meta = { title: "Patterns/KpiCharts" };
export default meta;
type Story = StoryObj;

/** `DonutChart`: share of a total, optional centre value and label. */
export const Donut: Story = {
  render: () => (
    <DonutChart
      data={[
        { label: "Won", value: 48, color: "var(--chart-2, #22c55e)" },
        { label: "Open", value: 31, color: "var(--chart-1, #3b82f6)" },
        { label: "Lost", value: 21, color: "var(--chart-5, #ef4444)" },
      ]}
      size={120}
      centerValue="100"
      centerLabel="offers"
    />
  ),
};

/** `Sparkline`: a trend line without axes, sized by its container. */
export const SparklineTrend: Story = {
  render: () => (
    <div className="h-10 w-40">
      <Sparkline data={[4, 6, 5, 9, 8, 12, 11, 15]} color="var(--chart-1, #3b82f6)" />
    </div>
  ),
};
