import type { Meta, StoryObj } from "@storybook/react-vite";
import { AnimatedBrand } from "@bmsuisse/ui";

const meta: Meta<typeof AnimatedBrand> = {
  title: "Patterns/AnimatedBrand",
  component: AnimatedBrand,
  args: { product: "Sales", size: 48, animation: "bounce" },
};

export default meta;
type Story = StoryObj<typeof AnimatedBrand>;

export const Default: Story = {};
export const Orbit: Story = { args: { animation: "orbit" } };
export const Mark: Story = { args: { mode: "mark", size: 64 } };
export const One: Story = { args: { mode: "one" } };
export const Static: Story = { args: { autoPlay: false } };
