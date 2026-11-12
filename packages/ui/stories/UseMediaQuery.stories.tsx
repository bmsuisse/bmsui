import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMediaQuery } from "@bmsuisse/ui";

const meta: Meta = { title: "Hooks/useMediaQuery" };
export default meta;
type Story = StoryObj;

/** Tracks a `matchMedia` query; resize the preview (or use the viewport toolbar) to watch it flip. */
export const Breakpoint: Story = {
  render: () => {
    const wide = useMediaQuery("(min-width: 640px)");
    const dark = useMediaQuery("(prefers-color-scheme: dark)");
    return (
      <ul className="space-y-1 text-sm">
        <li>(min-width: 640px): <strong>{String(wide)}</strong></li>
        <li>prefers-color-scheme: dark: <strong>{String(dark)}</strong></li>
      </ul>
    );
  },
};
