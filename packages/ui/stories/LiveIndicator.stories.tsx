import type { Meta, StoryObj } from "@storybook/react-vite";
import { LiveIndicator } from "@bmsuisse/ui";

// Fixed instant so screenshots are stable (time shown in the viewer's zone).
const AT = new Date(2026, 10, 17, 14, 2, 11).getTime();

const meta: Meta<typeof LiveIndicator> = {
  title: "Patterns/LiveIndicator",
  component: LiveIndicator,
  args: { updatedAt: AT, intervalMs: 5000 },
};

export default meta;
type Story = StoryObj<typeof LiveIndicator>;

export const Default: Story = {};
export const Fetching: Story = { args: { fetching: true } };
export const Paused: Story = { args: { paused: true } };
export const BeforeFirstLoad: Story = { args: { updatedAt: 0 } };
export const LabelsAndLocale: Story = {
  args: { locale: "en-US", labels: { updated: (t) => `Last refresh ${t}` } },
};
