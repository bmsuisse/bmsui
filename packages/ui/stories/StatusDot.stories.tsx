import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusDot } from "@bmsuisse/ui";

const meta: Meta<typeof StatusDot> = { title: "Patterns/StatusDot", component: StatusDot, args: { status: "approved" } };

export default meta;
type Story = StoryObj<typeof StatusDot>;

export const Default: Story = {};
export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusDot tone="success" label="Online" />
      <StatusDot tone="warning" label="Degraded" />
      <StatusDot tone="error" label="Offline" />
      <StatusDot tone="info" label="Syncing" />
      <StatusDot tone="neutral" label="Unknown" />
    </div>
  ),
};
export const Pulse: Story = { args: { tone: "success", label: "Live", pulse: true, status: undefined } };
export const FromStatus: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusDot status="approved" />
      <StatusDot status="pending" />
      <StatusDot status="rejected" />
      <StatusDot status="approved" hideLabel size="md" />
    </div>
  ),
};
