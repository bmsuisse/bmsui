import type { Meta, StoryObj } from "@storybook/react-vite";
import { CurrencyDollarIcon, UsersIcon } from "@heroicons/react/24/outline";
import { KpiCard } from "@bmsuisse/ui";

const meta: Meta<typeof KpiCard> = {
  title: "Patterns/KpiCard",
  component: KpiCard,
  args: { label: "New customers", value: "248", icon: UsersIcon, badge: { text: "+8%", positive: true }, sparkline: [3, 4, 3, 5, 6, 5, 7] },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof KpiCard>;

export const Default: Story = {};
export const Hero: Story = {
  args: { label: "Revenue", value: "1.2M", variant: "hero", icon: CurrencyDollarIcon, sub: "vs. 1.07M last year", progress: 72, progressLabel: "72% of target", sparkline: undefined },
};
export const Mini: Story = { args: { variant: "mini", label: "Overdue", value: "2", sub: "since 3 days", subTone: "danger", badge: undefined } };
export const Donut: Story = {
  args: {
    variant: "donut", label: "Revenue by channel", centerValue: "1.2M", value: undefined, badge: undefined, sparkline: undefined, icon: undefined,
    segments: [{ label: "Direct", value: 52 }, { label: "Partners", value: 31 }, { label: "Online", value: 17 }],
  },
};
export const Loading: Story = { args: { loading: true } };
export const Error: Story = { args: { error: "Couldn't load KPI", onRetry: () => {} } };
