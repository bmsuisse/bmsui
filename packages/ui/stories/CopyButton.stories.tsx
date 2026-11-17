import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyButton } from "@bmsuisse/ui";

const meta: Meta<typeof CopyButton> = {
  title: "Patterns/CopyButton",
  component: CopyButton,
  args: { value: "9f1c2b7e-4a0d-4c1e-8e3a-0b5d7c9a1f22" },
};

export default meta;
type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {};
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <CopyButton value="abc" size="sm" />
      <CopyButton value="abc" size="md" />
      <CopyButton value="abc" variant="outline" size="md" />
    </div>
  ),
};
export const WithText: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <CopyButton value="https://example.com/offers/42" variant="outline">Copy link</CopyButton>
      <CopyButton value="https://example.com/offers/42" size="md" variant="outline">Copy link</CopyButton>
    </div>
  ),
};
export const InlineWithId: Story = {
  render: () => (
    <div className="flex max-w-full items-center gap-1 text-sm">
      <code className="min-w-0 truncate rounded-sm bg-muted px-1.5 py-0.5 text-xs">9f1c2b7e-4a0d-4c1e-8e3a-0b5d7c9a1f22</code>
      <CopyButton value="9f1c2b7e-4a0d-4c1e-8e3a-0b5d7c9a1f22" label="Copy ID" />
    </div>
  ),
};
export const LabelsOverride: Story = { args: { labels: { label: "Kopieren", copied: "Kopiert", failed: "Kopieren fehlgeschlagen" } } };
