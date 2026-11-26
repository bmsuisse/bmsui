import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Button, Input, Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
  useKeyboardOffset, useVisualViewportHeight,
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

function KeyboardReadout() {
  const offset = useKeyboardOffset();
  const height = useVisualViewportHeight();
  return (
    <p className="text-xs text-muted-foreground">
      Keyboard offset {offset}px, visual viewport {height ?? "n/a"}px.
    </p>
  );
}

/** On a phone, focusing the input lifts the sheet above the on-screen keyboard. */
export const BottomKeyboardAware: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild><Button variant="outline">Open bottom</Button></SheetTrigger>
      <SheetContent side="bottom" keyboardAware resizable>
        <SheetHeader>
          <SheetTitle>Reply</SheetTitle>
          <SheetDescription>The footer stays above the keyboard.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-2"><Input aria-label="Message" placeholder="Message" /><KeyboardReadout /></SheetBody>
        <SheetFooter><Button>Send</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};
