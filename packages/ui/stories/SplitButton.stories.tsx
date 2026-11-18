import { ClockIcon, PaperAirplaneIcon, TrashIcon } from "@heroicons/react/16/solid";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SplitButton } from "@bmsuisse/ui";

const items = [
  { id: "close", label: "Senden und schliessen", onSelect: () => {} },
  { id: "later", label: "Später senden", onSelect: () => {}, icon: ClockIcon },
  { id: "discard", label: "Entwurf verwerfen", onSelect: () => {}, icon: TrashIcon, danger: true },
];

const meta: Meta<typeof SplitButton> = {
  title: "Patterns/SplitButton",
  component: SplitButton,
  args: { children: "Senden", items },
};

export default meta;
type Story = StoryObj<typeof SplitButton>;

/** Opens the menu so the story shows it without interaction (Radix opens on pointerdown). */
const openMenu = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const chevron = canvasElement.querySelector<HTMLElement>('button[aria-haspopup="menu"]');
  chevron?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
};

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex max-w-full flex-wrap items-center gap-3">
      <SplitButton items={items}>Senden</SplitButton>
      <SplitButton variant="secondary" items={items}>Senden</SplitButton>
      <SplitButton variant="outline" items={items}>Senden</SplitButton>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex max-w-full flex-wrap items-center gap-3">
      <SplitButton size="xs" items={items}>Senden</SplitButton>
      <SplitButton size="sm" items={items}>Senden</SplitButton>
      <SplitButton items={items}>Senden</SplitButton>
      <SplitButton size="lg" items={items}>Senden</SplitButton>
    </div>
  ),
};

export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };

export const WithDisabledItem: Story = {
  play: openMenu,
  args: { items: [{ id: "later", label: "Später senden (nicht verfügbar)", onSelect: () => {}, disabled: true }, items[0]!] },
};

export const MenuAbove: Story = {
  args: { side: "top", align: "start", children: <><PaperAirplaneIcon aria-hidden="true" className="size-4" /> Senden</> },
  decorators: [(Story) => <div className="pt-40"><Story /></div>],
  play: openMenu,
};
