import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeBlock } from "@bmsuisse/ui";

const SQL = `SELECT o.id, c.name, SUM(l.qty * l.price) AS total
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_lines l ON l.order_id = o.id
WHERE o.status = 'open'
GROUP BY o.id, c.name
HAVING SUM(l.qty * l.price) > 1000
ORDER BY total DESC;`;

const meta: Meta<typeof CodeBlock> = {
  title: "Patterns/CodeBlock",
  component: CodeBlock,
  decorators: [(Story) => <div className="w-[34rem] max-w-full"><Story /></div>],
  args: { code: SQL, language: "sql" },
};
export default meta;
type Story = StoryObj<typeof CodeBlock>;

export const Default: Story = {};
export const LineNumbers: Story = { args: { lineNumbers: true } };
export const MaxHeight: Story = { args: { lineNumbers: true, maxHeight: 96 } };
export const Wrap: Story = {
  args: { language: "log", wrap: true, code: "2026-11-17T09:12:44Z ERROR request failed: " + "connection reset by peer ".repeat(8) },
};
export const LongLine: Story = { args: { language: "txt", code: "https://example.com/" + "very-long-path-segment/".repeat(12) } };
export const NoCopy: Story = { args: { copyable: false } };
export const Title: Story = { args: { title: "queries/open_orders.sql" } };
export const NoHeader: Story = { args: { language: undefined, copyable: false, code: "plain output\nwithout a header" } };
export const GermanLabels: Story = { args: { labels: { copy: "Kopieren", copied: "Kopiert", copyFailed: "Fehlgeschlagen" } } };

/** A toy highlighter showing the slot: keywords get the accent colour. */
export const WithHighlight: Story = {
  args: {
    lineNumbers: true,
    highlight: (code) =>
      code.split(/(\b(?:SELECT|FROM|JOIN|ON|WHERE|GROUP BY|HAVING|ORDER BY|AS|SUM|DESC)\b)/g).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold text-sky-700 dark:text-sky-300">
            {part}
          </span>
        ) : (
          part
        ),
      ),
  },
};
