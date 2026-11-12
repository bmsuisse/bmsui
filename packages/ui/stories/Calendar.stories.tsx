import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Calendar, type DateRange } from "@bmsuisse/ui";

const meta: Meta<typeof Calendar> = { title: "Patterns/Calendar", component: Calendar };
export default meta;
type Story = StoryObj<typeof Calendar>;

export const Single: Story = {
  render: () => {
    const [v, setV] = useState("2026-11-12");
    return <Calendar value={v} onValueChange={setV} today="2026-11-12" />;
  },
};
export const Range: Story = {
  render: () => {
    const [v, setV] = useState<DateRange>({ from: "2026-11-10", to: "2026-11-18" });
    return <Calendar mode="range" value={v} onValueChange={setV} today="2026-11-12" />;
  },
};
export const MinMaxAndDisabledDays: Story = {
  render: () => {
    const [v, setV] = useState("");
    return (
      <Calendar value={v} onValueChange={setV} today="2026-11-12" min="2026-11-03" max="2026-11-28" isDateDisabled={(iso) => iso === "2026-11-25"} />
    );
  },
};
export const EnglishWeekStartsSunday: Story = {
  render: () => {
    const [v, setV] = useState("2026-11-12");
    return <Calendar value={v} onValueChange={setV} locale="en-US" weekStartsOn={0} today="2026-11-12" />;
  },
};
