import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Select" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string>();
    return (
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-56"><SelectValue placeholder="Pick a fruit" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="pear">Pear</SelectItem>
          <SelectItem value="plum">Plum</SelectItem>
        </SelectContent>
      </Select>
    );
  },
};
export const Grouped: Story = {
  render: () => (
    <Select defaultValue="pear">
      <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="pear">Pear</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectItem value="carrot">Carrot</SelectItem>
          <SelectItem value="leek" disabled>Leek (sold out)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};
export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-56"><SelectValue placeholder="Disabled" /></SelectTrigger>
      <SelectContent><SelectItem value="a">A</SelectItem></SelectContent>
    </Select>
  ),
};
