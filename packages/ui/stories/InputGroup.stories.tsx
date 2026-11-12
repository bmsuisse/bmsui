import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@bmsuisse/ui";

const meta: Meta<typeof InputGroup> = {
  title: "Patterns/InputGroup",
  component: InputGroup,
  decorators: [(Story) => <div className="w-80"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof InputGroup>;

export const LeadingIcon: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon><MagnifyingGlassIcon /></InputGroupAddon>
      <InputGroupInput placeholder="Search customers" />
    </InputGroup>
  ),
};
export const TextAddons: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon>CHF</InputGroupAddon>
      <InputGroupInput defaultValue="1'250.00" className="tabular-nums" />
      <InputGroupAddon>/ month</InputGroupAddon>
    </InputGroup>
  ),
};
export const TrailingButton: Story = {
  render: () => {
    const [show, setShow] = useState(false);
    return (
      <InputGroup>
        <InputGroupInput type={show ? "text" : "password"} defaultValue="hunter22" />
        <InputGroupButton aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)}>
          {show ? <EyeSlashIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroup>
    );
  },
};
export const Small: Story = {
  render: () => (
    <InputGroup size="sm">
      <InputGroupInput placeholder="name@company.ch" />
      <InputGroupButton size="xs" variant="outline" className="h-6">Invite</InputGroupButton>
    </InputGroup>
  ),
};
