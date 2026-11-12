import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, CollapsibleSection } from "@bmsuisse/ui";

const meta: Meta<typeof CollapsibleSection> = {
  title: "Patterns/CollapsibleSection",
  component: CollapsibleSection,
  args: { title: "Contacts", count: 3, children: <p className="text-sm">Anna, Ben and Carla.</p> },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof CollapsibleSection>;

export const Default: Story = { args: { defaultOpen: true } };
export const Card: Story = {
  args: { variant: "card", description: "People linked to this customer", defaultOpen: true, actions: <Button size="sm" variant="outline">Add</Button> },
};
export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <CollapsibleSection variant="card" title="Controlled" open={open} onOpenChange={setOpen}>
        <p className="text-sm">Open state: {String(open)}</p>
      </CollapsibleSection>
    );
  },
};
export const Disabled: Story = { args: { disabled: true } };
