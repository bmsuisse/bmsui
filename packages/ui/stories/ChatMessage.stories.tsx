import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClipboardIcon, HandThumbDownIcon, HandThumbUpIcon } from "@heroicons/react/24/outline";
import { Button, ChatMessage } from "@bmsuisse/ui";

const T = new Date("2026-11-17T09:41:00");

const meta: Meta<typeof ChatMessage> = {
  title: "Patterns/ChatMessage",
  component: ChatMessage,
  decorators: [(Story) => <div className="w-[34rem] max-w-full"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof ChatMessage>;

export const Assistant: Story = {
  args: {
    role: "assistant",
    name: "OneSales Assistant",
    avatar: true,
    time: T,
    children: (
      <>
        <p>Der Kunde Muster AG hat im letzten Quartal 14 Offerten erhalten, davon 9 gewonnen.</p>
        <p className="mt-2">Soll ich die offenen Positionen als Liste ausgeben?</p>
      </>
    ),
  },
};
export const User: Story = { args: { role: "user", time: T, children: "Zeig mir die offenen Offerten von Muster AG" } };
export const System: Story = { args: { role: "system", children: "Conversation moved to the Sales team" } };
export const Sending: Story = { args: { role: "user", status: "sending", children: "Is anybody there?" } };
export const Streaming: Story = {
  args: { role: "assistant", name: "Assistant", avatar: true, status: "streaming", children: "Ich suche die Offerten und fasse" },
};
export const UserError: Story = {
  args: { role: "user", status: "error", onRetry: () => undefined, children: "This did not go through" },
};
export const AssistantError: Story = {
  args: {
    role: "assistant",
    name: "Assistant",
    avatar: true,
    status: "error",
    error: "The model is overloaded. Try again in a moment.",
    onRetry: () => undefined,
    children: "Ich suche die Offerten und",
  },
};
export const WithActions: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector("button")?.focus();
  },
  args: {
    role: "assistant",
    name: "Assistant",
    avatar: true,
    children: "Hover (or focus) the message to see actions; on touch they are always visible.",
    actions: (
      <>
        <Button variant="ghost" size="icon-sm" aria-label="Copy"><ClipboardIcon /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Good answer"><HandThumbUpIcon /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Bad answer"><HandThumbDownIcon /></Button>
      </>
    ),
  },
};
export const LongUnbrokenText: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ChatMessage role="user">
        https://example.com/a/really/long/path/that/never/breaks/and/keeps/going/and/going/and/going/forever?query=1234567890
      </ChatMessage>
      <ChatMessage role="assistant" name="Assistant" avatar>
        Supercalifragilisticexpialidocious_Donaudampfschifffahrtsgesellschaftskapitaensmuetze_0123456789012345678901234567890
        <pre className="mt-2 rounded-md bg-muted p-2 text-xs">{"const wide = 'this code line is much wider than a phone screen can show without scrolling';"}</pre>
      </ChatMessage>
    </div>
  ),
};
export const GermanLabels: Story = {
  args: {
    role: "user",
    status: "error",
    onRetry: () => undefined,
    labels: { failed: "Nachricht konnte nicht gesendet werden.", retry: "Erneut versuchen" },
    children: "Hallo",
  },
};
export const Conversation: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ChatMessage role="user" time={T}>Wie viele Offerten sind offen?</ChatMessage>
      <ChatMessage role="assistant" name="Assistant" avatar time={T}>Aktuell sind 23 Offerten offen, 6 davon laufen diese Woche ab.</ChatMessage>
    </div>
  ),
};
