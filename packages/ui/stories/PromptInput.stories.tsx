import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocumentIcon, MicrophoneIcon, PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button, PromptInput } from "@bmsuisse/ui";

const meta: Meta<typeof PromptInput> = {
  title: "Patterns/PromptInput",
  component: PromptInput,
  decorators: [(Story) => <div className="w-[36rem] max-w-full"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof PromptInput>;

export const Default: Story = {};
export const WithDraft: Story = { args: { defaultValue: "Fasse die letzte Sitzung zusammen." } };
export const MultilineMaxRows: Story = {
  args: { maxRows: 4, defaultValue: "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6 (scrolls after 4 rows)" },
};
export const Streaming: Story = { args: { streaming: true, defaultValue: "", onStop: () => undefined } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "Not available right now" } };
export const ModEnterSubmits: Story = {
  args: { submitOn: "mod-enter", placeholder: "Enter = newline, Ctrl/Cmd+Enter = send" },
};
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState("");
    const [sent, setSent] = useState<string[]>([]);
    return (
      <div className="flex flex-col gap-2">
        <PromptInput value={value} onValueChange={setValue} onSubmit={(text) => setSent((s) => [...s, text])} />
        <p className="text-xs text-muted-foreground">Sent: {sent.length ? sent.join(" | ") : "nothing yet"}</p>
      </div>
    );
  },
};
export const StreamingToggle: Story = {
  render: () => {
    const [streaming, setStreaming] = useState(false);
    return (
      <PromptInput
        streaming={streaming}
        onSubmit={() => setStreaming(true)}
        onStop={() => setStreaming(false)}
        placeholder="Send to start, then Stop"
      />
    );
  },
};
export const WithSlots: Story = {
  args: {
    defaultValue: "Bitte analysiere die Beilage",
    attachments: (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-foreground/10 bg-muted py-1 pr-1 pl-2 text-xs dark:border-border">
        <DocumentIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="flex min-w-0">
          <span className="truncate">offerte-muster-ag-2026</span>
          <span className="shrink-0">.pdf</span>
        </span>
        <button type="button" aria-label="Remove attachment" className="grid size-5 place-items-center rounded-sm hover:bg-foreground/10">
          <XMarkIcon className="size-3" />
        </button>
      </span>
    ),
    leading: <Button type="button" variant="ghost" size="icon-sm" aria-label="Attach file"><PaperClipIcon /></Button>,
    actions: <Button type="button" variant="ghost" size="icon-sm" aria-label="Dictate"><MicrophoneIcon /></Button>,
  },
};
export const GermanLabels: Story = {
  args: { labels: { message: "Nachricht", placeholder: "Nachricht schreiben…", send: "Senden", stop: "Stopp" } },
};
