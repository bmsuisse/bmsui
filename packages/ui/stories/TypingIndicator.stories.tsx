import type { Meta, StoryObj } from "@storybook/react-vite";
import { TypingIndicator } from "@bmsuisse/ui";

const meta: Meta<typeof TypingIndicator> = {
  title: "Patterns/TypingIndicator",
  component: TypingIndicator,
  tags: ["no-visual"],
};
export default meta;
type Story = StoryObj<typeof TypingIndicator>;

export const Default: Story = {};
export const Small: Story = { args: { size: "sm" } };
export const WithLabel: Story = { args: { showLabel: true, label: "Assistant is thinking…" } };
export const Static: Story = { args: { animated: false } };
export const InBubble: Story = {
  render: () => (
    <div className="inline-flex rounded-2xl bg-foreground/[0.06] px-4 py-3">
      <TypingIndicator />
    </div>
  ),
};
