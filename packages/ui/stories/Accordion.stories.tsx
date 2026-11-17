import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { BellIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge } from "@bmsuisse/ui";

const meta: Meta<typeof Accordion> = {
  title: "Patterns/Accordion",
  component: Accordion,
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof Accordion>;

const items = (
  <>
    <AccordionItem value="a">
      <AccordionTrigger>How are offers matched?</AccordionTrigger>
      <AccordionContent>Positions are matched against the catalog by rules, search and an assistant review.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="b">
      <AccordionTrigger>Can I undo a match?</AccordionTrigger>
      <AccordionContent>Yes. Open the position and pick another article; the old match is kept in the history.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="c">
      <AccordionTrigger>Who sees my offers?</AccordionTrigger>
      <AccordionContent>Only you and the people you share them with.</AccordionContent>
    </AccordionItem>
  </>
);

export const Single: Story = {
  render: () => (
    <Accordion type="single" collapsible defaultValue="a">
      {items}
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" defaultValue={["a", "c"]}>
      {items}
    </Accordion>
  ),
};

export const Card: Story = {
  render: () => (
    <Accordion type="single" collapsible variant="card" defaultValue="n">
      <AccordionItem value="n">
        <AccordionTrigger icon={<BellIcon />} description="Mail and push" meta={<Badge variant="secondary">3</Badge>}>
          Notifications
        </AccordionTrigger>
        <AccordionContent>Choose what reaches you and when.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="s">
        <AccordionTrigger icon={<ShieldCheckIcon />} description="Password and sessions">
          Security
        </AccordionTrigger>
        <AccordionContent>
          <input
            aria-label="Display name"
            defaultValue="State survives folding"
            className="w-full rounded-md border border-foreground/20 bg-background px-2 py-1 text-sm"
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="d" disabled>
        <AccordionTrigger>Billing (disabled)</AccordionTrigger>
        <AccordionContent>Not reachable.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState("b");
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Open: {value || "none"}</p>
        <Accordion type="single" collapsible value={value} onValueChange={setValue}>
          {items}
        </Accordion>
      </div>
    );
  },
};

export const LongTitle: Story = {
  render: () => (
    <Accordion type="single" collapsible defaultValue="a">
      <AccordionItem value="a">
        <AccordionTrigger description="A description that wraps on a narrow screen as well">
          A really long question title that has to wrap onto several lines on a phone without pushing the chevron out
        </AccordionTrigger>
        <AccordionContent>Answer.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Static: Story = {
  render: () => (
    <Accordion type="single" collapsible animated={false}>
      {items}
    </Accordion>
  ),
};
