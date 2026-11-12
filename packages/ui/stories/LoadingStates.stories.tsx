import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingOverlay, LoadingSpinner, LoadingState, RefreshBar } from "@bmsuisse/ui";

const meta: Meta = { title: "Patterns/LoadingStates", component: LoadingSpinner };

export default meta;
type Story = StoryObj;

export const Spinner: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <LoadingSpinner size="sm" />
      <LoadingSpinner />
      <LoadingSpinner size="lg" />
      <LoadingSpinner label="Loading..." />
    </div>
  ),
};
export const Overlay: Story = {
  render: () => <div className="relative h-40 max-w-sm rounded-md border"><LoadingOverlay /></div>,
};
export const Skeleton: Story = {
  render: () => <div className="max-w-sm"><LoadingState delayMs={0} lines={4} /></div>,
};
export const SpinnerVariant: Story = {
  render: () => <div className="max-w-sm"><LoadingState delayMs={0} variant="spinner" label="Loading offers" /></div>,
};
export const Refresh: Story = {
  render: () => (
    <div className="relative max-w-sm rounded-md border p-4 text-sm">
      <RefreshBar active />
      Existing data stays visible while refetching.
    </div>
  ),
};
