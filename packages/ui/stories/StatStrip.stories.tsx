import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatStrip, StatStripItem } from "@bmsuisse/ui";

const meta: Meta<typeof StatStrip> = { title: "Patterns/StatStrip", component: StatStrip };

export default meta;
type Story = StoryObj<typeof StatStrip>;

export const Default: Story = {
  render: () => (
    <StatStrip aria-label="Queue metrics">
      <StatStripItem label="In queue" value="128" sub="+12 last hour" />
      <StatStripItem label="Running" value="6" />
      <StatStripItem label="Failed" value="3" sub="needs attention" tone="danger" />
      <StatStripItem label="Success rate" value="99.2%" sub="stable" tone="success" />
      <StatStripItem label="Retries" value="14" sub="above normal" tone="warning" />
    </StatStrip>
  ),
};
export const Interactive: Story = {
  render: () => (
    <StatStrip aria-label="Links">
      <StatStripItem label="Open orders" value="42" href="#orders" />
      <StatStripItem label="Alerts" value="3" tone="danger" sub="open" onClick={() => {}} />
      <StatStripItem label="Static" value="7" />
    </StatStrip>
  ),
};
export const Loading: Story = {
  render: () => (
    <StatStrip aria-label="Loading">
      <StatStripItem label="In queue" value="" loading />
      <StatStripItem label="Running" value="" loading />
      <StatStripItem label="Failed" value="" loading />
    </StatStrip>
  ),
};
export const OddCountAndLongLabels: Story = {
  render: () => (
    <StatStrip aria-label="Odd">
      <StatStripItem label="A rather long label that truncates" value="1'234'567.89 CHF" />
      <StatStripItem label="Another long label for the cell" value="42" sub="a long supporting line that truncates" />
      <StatStripItem label="Third" value="0" />
    </StatStrip>
  ),
};
export const FlashesOnChange: Story = {
  render: () => {
    const [n, setN] = useState(120);
    useEffect(() => {
      const id = setInterval(() => setN((v) => v + 3), 2500);
      return () => clearInterval(id);
    }, []);
    return (
      <StatStrip aria-label="Live">
        <StatStripItem label="Requests" value={n} sub="updates every 2.5 s" />
        <StatStripItem label="Errors" value="0" />
      </StatStrip>
    );
  },
  tags: ["no-visual"],
};
