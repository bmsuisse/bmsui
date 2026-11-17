import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DateTimeInput, toLocalIsoDateTime } from "@bmsuisse/ui";

const meta: Meta<typeof DateTimeInput> = {
  title: "Patterns/DateTimeInput",
  component: DateTimeInput,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("2026-11-12T14:30");
    return (
      <div className="flex w-80 max-w-full flex-col gap-2">
        <DateTimeInput value={value} onValueChange={setValue} />
        <p className="text-xs text-muted-foreground">Value: {value || "(none)"}</p>
      </div>
    );
  },
};

export const EmptyWithDefaultTime: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div className="w-80 max-w-full">
        <DateTimeInput value={value} onValueChange={setValue} defaultTime="09:00" />
        <p className="mt-2 text-xs text-muted-foreground">Value: {value || "(none)"}</p>
      </div>
    );
  },
};

export const MinMaxDatetime: Story = {
  render: () => {
    const [value, setValue] = useState("2026-11-12T10:30");
    return (
      <div className="w-80 max-w-full">
        <DateTimeInput value={value} onValueChange={setValue} min="2026-11-12T10:00" max="2026-11-20T16:00" step={15} />
        <p className="mt-2 text-xs text-muted-foreground">Times are only restricted on 12.11. (from 10:00) and 20.11. (until 16:00).</p>
      </div>
    );
  },
};

export const SmallDisabledTwelveHour: Story = {
  render: () => (
    <div className="flex w-80 max-w-full flex-col gap-3">
      <DateTimeInput size="sm" value="2026-11-12T14:30" onValueChange={() => {}} />
      <DateTimeInput disabled value="2026-11-12T14:30" onValueChange={() => {}} />
      <DateTimeInput readOnly value="2026-11-12T14:30" onValueChange={() => {}} />
      <DateTimeInput locale="en-US" value="2026-11-12T14:30" onValueChange={() => {}} />
    </div>
  ),
};

export const LocalIsoHelper: Story = {
  name: "toLocalIsoDateTime",
  render: () => (
    <p className="break-words text-sm">
      <code>toLocalIsoDateTime(new Date(2026, 0, 5, 23, 30))</code> = <code>{toLocalIsoDateTime(new Date(2026, 0, 5, 23, 30))}</code>
    </p>
  ),
};
