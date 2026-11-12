import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Button, Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Sheet" };
export default meta;
type Story = StoryObj;

function Demo({ side }: { side: "top" | "right" | "bottom" | "left" }) {
  return (
    <Sheet>
      <SheetTrigger asChild><Button variant="outline">Open {side}</Button></SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow down the list.</SheetDescription>
        </SheetHeader>
        <SheetBody className="text-sm text-muted-foreground">Sheet body content.</SheetBody>
        <SheetFooter><Button>Apply</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export const Right: Story = { render: () => <Demo side="right" /> };
export const Left: Story = { render: () => <Demo side="left" /> };
export const Top: Story = { render: () => <Demo side="top" /> };
export const Bottom: Story = { render: () => <Demo side="bottom" /> };
