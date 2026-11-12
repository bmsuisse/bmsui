import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useLongPress } from "@bmsuisse/ui";

const meta: Meta = { title: "Hooks/useLongPress", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [status, setStatus] = useState("idle");
    const [clicks, setClicks] = useState(0);
    const handlers = useLongPress(() => setStatus("long press fired"), {
      threshold: 600,
      onStart: () => setStatus("holding…"),
      onCancel: () => setStatus("cancelled"),
    });
    return (
      <div className="flex flex-col gap-3 text-sm">
        <div
          {...handlers}
          onClick={() => setClicks((c) => c + 1)}
          className="w-fit cursor-pointer select-none rounded-lg border border-border px-6 py-4"
        >
          Hold me for 600ms
        </div>
        <p>Status: <strong>{status}</strong> · plain clicks: {clicks} (not counted after a long press)</p>
      </div>
    );
  },
};
