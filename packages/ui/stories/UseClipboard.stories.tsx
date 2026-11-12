import type { Meta, StoryObj } from "@storybook/react-vite";
import { useClipboard, Button } from "@bmsuisse/ui";

const meta: Meta = { title: "Hooks/useClipboard", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const { copy, copied, error, reset } = useClipboard({ timeout: 2000 });
    const text = "OF-2026-0312";
    return (
      <div className="flex items-center gap-3 text-sm">
        <code>{text}</code>
        <Button size="sm" variant="outline" onClick={() => void copy(text)}>{copied ? "Copied!" : "Copy"}</Button>
        <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
        {error && <span className="text-red-700 dark:text-red-300">{error.message}</span>}
      </div>
    );
  },
};
