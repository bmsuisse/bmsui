import type { Meta, StoryObj } from "@storybook/react-vite";
import { SkipLinks } from "@bmsuisse/ui";

const meta: Meta<typeof SkipLinks> = {
  title: "Patterns/SkipLinks",
  component: SkipLinks,
  args: {
    links: [
      { label: "Skip to main content", href: "#main" },
      { label: "Skip to search", onSelect: () => document.getElementById("search")?.focus() },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof SkipLinks>;

export const Default: Story = {
  render: (args) => (
    <div className="relative min-h-40 text-sm">
      <SkipLinks {...args} className="absolute" />
      <p className="mb-3 text-muted-foreground">Click here, then press Tab: the links appear in the top-left corner.</p>
      <input id="search" placeholder="Search" className="rounded-md border border-input bg-background px-2 py-1" />
      <main id="main" tabIndex={-1} className="mt-3">Main content</main>
    </div>
  ),
};
export const ShownForReview: Story = {
  render: (args) => (
    <div className="relative min-h-24">
      <nav aria-label="Preview" className="flex max-w-full flex-wrap gap-2">
        {args.links.map((l) => (
          <span key={l.label} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-lg">
            {l.label}
          </span>
        ))}
      </nav>
    </div>
  ),
};
export const LabelOverride: Story = {
  args: { label: "Direkt springen", links: [{ label: "Zum Inhalt", href: "#main" }] },
};
