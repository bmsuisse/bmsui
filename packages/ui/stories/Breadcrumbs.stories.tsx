import type { Meta, StoryObj } from "@storybook/react-vite";
import { HomeIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "@bmsuisse/ui";

const items = [
  { label: "Home", href: "#", icon: HomeIcon },
  { label: "Customers", href: "#" },
  { label: "Switzerland", href: "#" },
  { label: "Zurich", href: "#" },
  { label: "Acme AG" },
];

const meta: Meta<typeof Breadcrumbs> = {
  title: "Patterns/Breadcrumbs",
  component: Breadcrumbs,
  args: { items },
};

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {};
export const Collapsed: Story = { args: { maxItems: 3 } };
export const CustomSeparator: Story = { args: { items: items.slice(0, 3), separator: "/" } };
