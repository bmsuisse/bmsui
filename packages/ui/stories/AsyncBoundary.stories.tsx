import type { Meta, StoryObj } from "@storybook/react-vite";
import { AsyncBoundary } from "@bmsuisse/ui";

const meta: Meta<typeof AsyncBoundary> = {
  title: "Patterns/AsyncBoundary",
  component: AsyncBoundary,
  args: { children: <p className="text-sm">Loaded content: 42 offers.</p> },
  decorators: [(Story) => <div className="relative min-h-40 max-w-lg rounded-md border p-4"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof AsyncBoundary>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Error: Story = { args: { error: "Couldn't load offers", onRetry: () => {} } };
export const Empty: Story = { args: { empty: true, emptyContent: <p className="text-sm text-muted-foreground">Nothing here yet.</p> } };
export const Refetching: Story = { args: { loading: true, hasData: true } };
export const ErrorOverStaleData: Story = { args: { error: "Couldn't refresh", onRetry: () => {}, hasData: true } };
