import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { PromptSuggestions } from "@bmsuisse/ui";

const meta: Meta<typeof PromptSuggestions> = {
  title: "Patterns/PromptSuggestions",
  component: PromptSuggestions,
  args: {
    "aria-label": "Suggested questions",
    suggestions: [
      "Summarise this customer",
      "Show open quotes",
      "Which products sold best last quarter?",
      "Draft a follow-up email",
      "Compare with last year",
      "Export as Excel",
    ],
  },
  decorators: [(Story) => <div className="w-[30rem] max-w-full"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof PromptSuggestions>;

export const Default: Story = {};
export const Wrapped: Story = { args: { wrap: true } };
export const Disabled: Story = { args: { disabled: true } };
export const FewItems: Story = { args: { suggestions: ["Yes", "No"] } };
export const ObjectsWithPrompt: Story = {
  args: {
    suggestions: [
      { id: "a", label: "Summarise", prompt: "Summarise this customer in three bullet points." },
      { id: "b", label: "Open quotes", prompt: "List all open quotes with their expiry date." },
    ],
  },
};
export const Selecting: Story = {
  render: (args) => {
    const [picked, setPicked] = useState<string>("");
    return (
      <div className="flex flex-col gap-2">
        <PromptSuggestions {...args} onSelect={(prompt) => setPicked(prompt)} />
        <p className="text-xs text-muted-foreground">Picked: {picked || "nothing"}</p>
      </div>
    );
  },
};
export const Rtl: Story = {
  render: (args) => (
    <div dir="rtl">
      <PromptSuggestions {...args} />
    </div>
  ),
};
