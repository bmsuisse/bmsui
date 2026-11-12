import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollArea, ScrollBar, Separator } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/ScrollArea" };
export default meta;
type Story = StoryObj;

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-48 w-56 rounded-md border">
      <div className="p-3 text-sm">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i}>
            <div className="py-1.5">Item {i + 1}</div>
            <Separator />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-72 whitespace-nowrap rounded-md border">
      <div className="flex gap-3 p-3">
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} className="grid h-16 w-24 shrink-0 place-items-center rounded-md bg-muted text-sm text-muted-foreground">{i + 1}</div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};
