import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { QuotedText } from "@bmsuisse/ui";

const QUOTE = (
  <>
    <p>Am 14.11.2026 um 08:12 schrieb Anna Keller &lt;anna@keller.ch&gt;:</p>
    <p className="mt-1">Guten Tag, könnten Sie uns die Offerte 2026-0412 bitte nochmals zustellen?</p>
  </>
);

const meta: Meta<typeof QuotedText> = {
  title: "Patterns/QuotedText",
  component: QuotedText,
  decorators: [(Story) => <div className="w-[30rem] max-w-full"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof QuotedText>;

export const Closed: Story = { args: { children: QUOTE } };
export const Open: Story = { args: { children: QUOTE, defaultOpen: true } };
export const WideContent: Story = {
  args: {
    defaultOpen: true,
    children: <pre className="text-xs">{"Position  Artikel                       Menge  Preis\n10        Wärmepumpe Aqua 12kW AG-0412  1     14'900.00"}</pre>,
  },
};
export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return <QuotedText open={open} onOpenChange={setOpen}>{QUOTE}</QuotedText>;
  },
};
export const German: Story = {
  args: { children: QUOTE, labels: { show: "Zitierten Text anzeigen", hide: "Zitierten Text ausblenden" } },
};
