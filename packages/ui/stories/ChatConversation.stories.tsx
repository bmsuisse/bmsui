import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, ChatConversation, ChatMessage, PromptInput } from "@bmsuisse/ui";

const meta: Meta<typeof ChatConversation> = {
  title: "Patterns/ChatConversation",
  component: ChatConversation,
  decorators: [(Story) => <div className="flex h-96 w-[36rem] max-w-full flex-col rounded-xl border border-foreground/10 dark:border-border"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof ChatConversation>;

const turns = Array.from({ length: 12 }, (_, i) => i);
const messages = turns.flatMap((i) => [
  <ChatMessage key={`u${i}`} role="user">Question number {i + 1}: what is the status?</ChatMessage>,
  <ChatMessage key={`a${i}`} role="assistant" name="Assistant" avatar>
    Answer number {i + 1}. Everything is on track and the next review is scheduled for Friday.
  </ChatMessage>,
]);

export const Default: Story = { render: () => <ChatConversation>{messages}</ChatConversation> };
export const Empty: Story = {
  render: () => (
    <ChatConversation empty={<p className="text-center text-sm text-muted-foreground">Ask anything to get started.</p>} />
  ),
};
export const LoadingHistory: Story = { render: () => <ChatConversation loadingHistory>{messages.slice(0, 2)}</ChatConversation> };
export const WithComposer: Story = {
  render: () => {
    const [items, setItems] = useState<string[]>(["First message", "Second message"]);
    return (
      <>
        <ChatConversation followKey={items.length}>
          {items.map((text, i) => (
            <ChatMessage key={i} role={i % 2 ? "assistant" : "user"} name={i % 2 ? "Assistant" : undefined} avatar={i % 2 === 1}>
              {text}
            </ChatMessage>
          ))}
        </ChatConversation>
        <div className="p-3">
          <PromptInput onSubmit={(text) => setItems((prev) => [...prev, text, "Noted."])} />
        </div>
      </>
    );
  },
};
export const StreamingGrowth: Story = {
  render: () => {
    const [text, setText] = useState("Streaming reply:");
    return (
      <>
        <ChatConversation>
          {messages.slice(0, 8)}
          <ChatMessage role="assistant" name="Assistant" avatar status="streaming">{text}</ChatMessage>
        </ChatConversation>
        <div className="p-3">
          <Button size="sm" variant="outline" onClick={() => setText((t) => `${t} more words keep arriving`)}>Add tokens</Button>
        </div>
      </>
    );
  },
};
