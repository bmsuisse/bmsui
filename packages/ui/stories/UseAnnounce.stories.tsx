import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, useAnnounce } from "@bmsuisse/ui";

const meta: Meta = { title: "Hooks/useAnnounce", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const announce = useAnnounce();
    const [log, setLog] = useState<string[]>([]);
    const say = (msg: string, politeness?: "assertive") => {
      announce(msg, { politeness });
      setLog((l) => [`${politeness ?? "polite"}: ${msg}`, ...l].slice(0, 5));
    };
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">Sends text to a hidden live region for screen readers. Visible log below is for demo only.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => say("3 rows saved")}>Polite</Button>
          <Button size="sm" variant="outline" onClick={() => say("Save failed", "assertive")}>Assertive</Button>
        </div>
        <ul>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
      </div>
    );
  },
};
