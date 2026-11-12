import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Collapsible" };
export default meta;
type Story = StoryObj;

function Demo({ initial }: { initial: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-72 space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          Details <ChevronDownIcon className={open ? "rotate-180" : ""} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-md border p-3 text-sm text-muted-foreground">
        Hidden content that expands below the trigger.
      </CollapsibleContent>
    </Collapsible>
  );
}

export const Default: Story = { render: () => <Demo initial={false} /> };
export const InitiallyOpen: Story = { render: () => <Demo initial /> };
