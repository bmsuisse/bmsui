import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircularProgress, ProgressBar } from "@bmsuisse/ui";

const meta: Meta = { title: "Patterns/Progress", component: ProgressBar };

export default meta;
type Story = StoryObj;

export const Bar: Story = { render: () => <div className="max-w-sm"><ProgressBar value={64} label="Upload" showValue /></div> };
export const Tones: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <ProgressBar value={40} tone="default" aria-label="default" />
      <ProgressBar value={100} tone="success" aria-label="success" />
      <ProgressBar value={70} tone="warning" aria-label="warning" />
      <ProgressBar value={20} tone="error" aria-label="error" />
    </div>
  ),
};
export const Sizes: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <ProgressBar value={50} size="sm" aria-label="sm" />
      <ProgressBar value={50} size="md" aria-label="md" />
      <ProgressBar value={50} size="lg" aria-label="lg" />
    </div>
  ),
};
export const Indeterminate: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <ProgressBar value={null} label="Working..." />
      <CircularProgress value={null} aria-label="Working" />
    </div>
  ),
};
export const Circular: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <CircularProgress value={25} showValue />
      <CircularProgress value={60} tone="success" size={64} showValue />
      <CircularProgress value={90} tone="error" size={48} strokeWidth={6} showValue />
    </div>
  ),
};
