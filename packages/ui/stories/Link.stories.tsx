import type { Meta, StoryObj } from "@storybook/react-vite";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { Link } from "@bmsuisse/ui";

const meta: Meta<typeof Link> = {
  title: "Primitives/Link",
  component: Link,
  args: { href: "#", children: "Open the order" },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Subtle: Story = { args: { variant: "subtle", children: "Back to orders" } };
export const External: Story = { args: { external: true, href: "https://example.com", children: "Documentation" } };
export const Inline: Story = {
  render: () => (
    <p className="max-w-sm text-sm">
      The contract renews automatically unless you{" "}
      <Link variant="inline" href="#">
        cancel it in the portal
      </Link>{" "}
      at least 30 days before the end of the term, see the{" "}
      <Link variant="inline" external href="https://example.com">
        terms
      </Link>
      .
    </p>
  ),
};
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2 text-sm">
      <Link href="#">Default link</Link>
      <Link href="#" variant="subtle">
        Subtle link
      </Link>
      <Link href="#" external>
        External link
      </Link>
      <Link href="#" external variant="subtle">
        External subtle link
      </Link>
      <Link href="#" aria-disabled="true">
        Disabled link
      </Link>
    </div>
  ),
};
export const GermanHint: Story = { args: { external: true, href: "https://example.com", children: "Dokumentation", labels: { newTab: "(öffnet in neuem Tab)" } } };

const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }>(({ to, ...props }, ref) => (
  <a ref={ref} href={to} onClick={(e) => e.preventDefault()} {...props} />
));
RouterLink.displayName = "RouterLink";

export const AsChildRouterLink: Story = {
  render: () => (
    <Link asChild external>
      <RouterLink to="/orders/42">Order 42 (a router Link)</RouterLink>
    </Link>
  ),
};
export const LongText: Story = {
  render: () => (
    <div className="w-56 max-w-full text-sm">
      <Link href="#" external>
        A rather long link label that has to wrap inside a narrow container without breaking the layout
      </Link>
    </div>
  ),
};
