import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { Reasoning } from "@bmsuisse/ui";

const TEXT =
  "The user wants open orders above 1,000 CHF. I should check which table holds order totals, then filter by status. Totals may be net or gross, so I will look at the column description first and state the assumption in the answer.";

const meta: Meta<typeof Reasoning> = {
  title: "Patterns/Reasoning",
  component: Reasoning,
  decorators: [(Story) => <div className="w-[34rem] max-w-full"><Story /></div>],
  args: { duration: 4, children: TEXT },
};
export default meta;
type Story = StoryObj<typeof Reasoning>;

export const Done: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const Streaming: Story = { tags: ["no-visual"], args: { streaming: true, duration: undefined } };
export const NoDuration: Story = { args: { duration: undefined } };
export const LongContent: Story = {
  args: {
    defaultOpen: true,
    maxHeight: 120,
    children: Array.from({ length: 6 }, (_, i) => <p key={i}>{TEXT}</p>),
  },
};
export const GermanLabels: Story = {
  args: { labels: { thoughtFor: (s) => `${s} s nachgedacht` }, duration: 4 },
};

export const LiveStream: Story = {
  tags: ["no-visual"],
  render: () => {
    const [chars, setChars] = useState(0);
    const full = Array.from({ length: 5 }, () => TEXT).join(" ");
    useEffect(() => {
      if (chars >= full.length) return;
      const t = setTimeout(() => setChars((c) => c + 6), 40);
      return () => clearTimeout(t);
    }, [chars, full.length]);
    const done = chars >= full.length;
    return (
      <div className="flex flex-col gap-2">
        <button type="button" className="self-start rounded-md border px-3 py-1 text-sm" onClick={() => setChars(0)}>
          Restart
        </button>
        <Reasoning streaming={!done} duration={done ? 7 : undefined}>
          {full.slice(0, chars)}
        </Reasoning>
      </div>
    );
  },
};
