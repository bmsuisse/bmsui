import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Kbd, formatHotkey, useHotkeys } from "@bmsuisse/ui";

const meta: Meta = { title: "Hooks/useHotkeys", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [last, setLast] = useState<string>("(none yet)");
    const keys = ["mod+k", "mod+shift+s", "g i", "?"];
    useHotkeys(keys.map((k) => ({ keys: k, handler: () => setLast(k) })));
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p>Press one of these (not while typing in an input):</p>
        <ul className="flex flex-wrap gap-3">
          {keys.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <code>{k}</code> → <Kbd>{formatHotkey(k)}</Kbd>
            </li>
          ))}
        </ul>
        <p>Last pressed: <strong>{last}</strong></p>
      </div>
    );
  },
};
