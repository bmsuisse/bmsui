import type { Meta, StoryObj } from "@storybook/react-vite";
import { JsonView } from "@bmsuisse/ui";

const PAYLOAD = {
  id: "ord_1042",
  status: "open",
  customer: { id: 77, name: "Muster AG", tags: ["key-account", "retail"] },
  lines: [
    { article: "A-1001", qty: 12, price: 4.9 },
    { article: "A-1002", qty: 3, price: 129 },
  ],
  note: null,
};

const meta: Meta<typeof JsonView> = {
  title: "Patterns/JsonView",
  component: JsonView,
  decorators: [(Story) => <div className="w-[34rem] max-w-full"><Story /></div>],
  args: { value: PAYLOAD },
};
export default meta;
type Story = StoryObj<typeof JsonView>;

export const Default: Story = {};
export const Closed: Story = { args: { defaultOpen: false, label: "Response" } };
export const ArrayValue: Story = { args: { value: [1, 2, 3, { a: "b" }], label: "Rows" } };
export const Primitive: Story = { args: { value: "just a string", label: "Value" } };
export const MaxHeight: Story = {
  args: { maxHeight: 120, value: { ...PAYLOAD, more: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`key_${i}`, i])) } },
};
export const LongValues: Story = { args: { value: { url: "https://example.com/" + "segment/".repeat(30), text: "word ".repeat(40) } } };
export const GermanLabels: Story = {
  args: { label: "Antwort", labels: { copy: "Kopieren", copied: "Kopiert", keys: (n) => `${n} Schlüssel` } },
};
