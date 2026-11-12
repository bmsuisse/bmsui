import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorState, InlineError } from "@bmsuisse/ui";

const meta: Meta = { title: "Patterns/ErrorState", component: ErrorState };

export default meta;
type Story = StoryObj;

export const Block: Story = {
  render: () => (
    <ErrorState
      error={{ title: "Couldn't load offers", message: "The server did not respond.", details: "GET /api/offers -> 503 Service Unavailable" }}
      onRetry={() => {}}
    />
  ),
};
export const Compact: Story = { render: () => <ErrorState variant="compact" error="Network error" onRetry={() => {}} /> };
export const FromError: Story = { render: () => <ErrorState error={new Error("Unexpected token < in JSON")} /> };
export const Inline: Story = { render: () => <InlineError error="Search failed" onRetry={() => {}} /> };
