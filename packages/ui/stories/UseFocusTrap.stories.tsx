import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, Input, useFocusTrap } from "@bmsuisse/ui";

const meta: Meta = { title: "Hooks/useFocusTrap", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [enabled, setEnabled] = useState(false);
    const ref = useFocusTrap<HTMLDivElement>({ enabled });
    return (
      <div className="flex max-w-md flex-col gap-3 text-sm">
        <Button size="sm" className="w-fit" onClick={() => setEnabled((e) => !e)}>
          {enabled ? "Release trap" : "Trap focus"}
        </Button>
        <div ref={ref} className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p>{enabled ? "Tab cycles only inside this box." : "Trap is off; Tab moves freely."}</p>
          <Input placeholder="First" />
          <Input placeholder="Second" />
          <Button size="sm" variant="outline" className="w-fit">Action</Button>
        </div>
        <Button size="sm" variant="ghost" className="w-fit">Outside button</Button>
      </div>
    );
  },
};
