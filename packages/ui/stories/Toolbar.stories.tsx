import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  BoldIcon,
  DocumentDuplicateIcon,
  ItalicIcon,
  PrinterIcon,
  ShareIcon,
  TrashIcon,
  UnderlineIcon,
} from "@heroicons/react/24/outline";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "@bmsuisse/ui";

const meta: Meta<typeof Toolbar> = {
  title: "Patterns/Toolbar",
  component: Toolbar,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [marks, setMarks] = useState<Record<string, boolean>>({ bold: true });
    const toggle = (k: string) => () => setMarks((m) => ({ ...m, [k]: !m[k] }));
    return (
      <Toolbar aria-label="Text formatting" className="w-fit">
        <ToolbarButton label="Undo" icon={ArrowUturnLeftIcon} />
        <ToolbarButton label="Redo" icon={ArrowUturnRightIcon} disabled />
        <ToolbarSeparator />
        <ToolbarButton label="Bold" icon={BoldIcon} pressed={!!marks.bold} onClick={toggle("bold")} />
        <ToolbarButton label="Italic" icon={ItalicIcon} pressed={!!marks.italic} onClick={toggle("italic")} />
        <ToolbarButton label="Underline" icon={UnderlineIcon} pressed={!!marks.underline} onClick={toggle("underline")} />
      </Toolbar>
    );
  },
};

export const WithLabels: Story = {
  render: () => (
    <Toolbar aria-label="Offer actions" className="w-fit">
      <ToolbarButton label="Duplicate" icon={DocumentDuplicateIcon} showLabel />
      <ToolbarButton label="Print" icon={PrinterIcon} showLabel />
      <ToolbarSeparator />
      <ToolbarButton label="Delete" icon={TrashIcon} showLabel />
    </Toolbar>
  ),
};

export const Overflow: Story = {
  render: () => (
    <div className="w-full max-w-[22rem] resize-x overflow-hidden border border-dashed border-border p-1">
      <p className="mb-2 text-xs text-muted-foreground">Resize this box (drag its corner) to move items into the menu.</p>
      <Toolbar aria-label="Offer actions" overflow>
        <ToolbarButton label="Duplicate" icon={DocumentDuplicateIcon} showLabel />
        <ToolbarButton label="Print" icon={PrinterIcon} showLabel />
        <ToolbarSeparator />
        <ToolbarButton label="Share" icon={ShareIcon} showLabel />
        <ToolbarButton label="Export" icon={ArrowDownTrayIcon} showLabel />
        <ToolbarButton label="Delete" icon={TrashIcon} showLabel />
      </Toolbar>
    </div>
  ),
};

export const Ghost: Story = {
  render: () => (
    <Toolbar aria-label="View" variant="ghost" className="w-fit">
      <ToolbarButton label="Bold" icon={BoldIcon} pressed showLabel />
      <ToolbarButton label="Italic" icon={ItalicIcon} pressed={false} showLabel />
    </Toolbar>
  ),
};
