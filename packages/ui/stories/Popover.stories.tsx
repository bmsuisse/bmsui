import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Popover" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline">Open popover</Button></PopoverTrigger>
      <PopoverContent className="w-64 text-sm">Some helpful content.</PopoverContent>
    </Popover>
  ),
};
export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline">Dimensions</Button></PopoverTrigger>
      <PopoverContent className="grid w-64 gap-2">
        <Label htmlFor="w">Width</Label>
        <Input id="w" defaultValue="100%" />
        <Label htmlFor="h">Height</Label>
        <Input id="h" defaultValue="25px" />
      </PopoverContent>
    </Popover>
  ),
};
export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild><Button variant="outline">{open ? "Close" : "Open"}</Button></PopoverTrigger>
        <PopoverContent align="start" className="w-56 text-sm">Align start.</PopoverContent>
      </Popover>
    );
  },
};
