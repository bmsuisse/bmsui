import type { Meta, StoryObj } from "@storybook/react-vite";
import { useScrollOverflow } from "@bmsuisse/ui";

const meta: Meta = { title: "Hooks/useScrollOverflow", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const { ref, top, bottom } = useScrollOverflow<HTMLDivElement>();
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p>top: <strong>{String(top)}</strong> · bottom: <strong>{String(bottom)}</strong></p>
        <div className="relative w-64">
          <div ref={ref} className="h-40 overflow-y-auto rounded-lg border border-border p-3">
            {Array.from({ length: 20 }, (_, i) => <p key={i} className="py-1">Row {i + 1}</p>)}
          </div>
          {top && <div className="pointer-events-none absolute inset-x-0 top-0 h-6 rounded-t-lg bg-gradient-to-b from-foreground/15 to-transparent" />}
          {bottom && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-lg bg-gradient-to-t from-foreground/15 to-transparent" />}
        </div>
      </div>
    );
  },
};
