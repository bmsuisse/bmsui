import type { Meta, StoryObj } from "@storybook/react-vite";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { ToolCallCard, ToolCallGroup } from "@bmsuisse/ui";

const meta: Meta<typeof ToolCallCard> = {
  title: "Patterns/ToolCallCard",
  component: ToolCallCard,
  decorators: [(Story) => <div className="w-[34rem] max-w-full"><Story /></div>],
  args: {
    name: "run_query",
    status: "done",
    summary: "3 rows from orders",
    duration: 1240,
    input: { sql: "select id, total from orders where status = 'open' limit 3", database: "sales" },
    output: [
      { id: 101, total: 249.9 },
      { id: 102, total: 18.5 },
      { id: 107, total: 1320 },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof ToolCallCard>;

export const Done: Story = {};
export const Running: Story = { tags: ["no-visual"], args: { status: "running", duration: undefined, summary: "Querying orders…", output: undefined } };
export const Pending: Story = { args: { status: "pending", duration: undefined, summary: "Waiting for approval", input: undefined, output: undefined } };
export const ErrorState: Story = {
  args: { status: "error", summary: "Timed out after 30 s", duration: 30000, output: undefined, error: "Query exceeded the 30 s limit. Narrow the date range and retry." },
};
export const NoDetails: Story = { args: { input: undefined, output: undefined, summary: "Loaded the sales skill" } };
export const TextPayload: Story = { args: { input: "SELECT 1;", output: "1 row affected", name: "execute_sql", summary: undefined, defaultOpen: true } };
export const LongText: Story = {
  args: {
    name: "search_products_by_manufacturer_article_identifier",
    summary: "Found 4,211 matching articles across all catalogues, sorted by relevance and availability in the central warehouse",
    duration: 125000,
  },
};
export const CustomIcon: Story = { args: { icon: <MagnifyingGlassIcon aria-hidden="true" className="h-4 w-4 shrink-0" /> } };
export const GermanLabels: Story = {
  args: { status: "error", summary: "Abgebrochen nach 30 s", duration: 30000, output: undefined, error: "Zeitüberschreitung", labels: { error: "Fehlgeschlagen", input: "Eingabe", output: "Ausgabe", errorDetails: "Fehler" } },
};

export const Group: StoryObj<typeof ToolCallGroup> = {
  render: () => (
    <ToolCallGroup>
      <ToolCallCard name="search_skills" summary="2 matches" duration={310} output={["sales", "pricing"]} />
      <ToolCallCard name="run_query" summary="3 rows" duration={1240} input={{ sql: "select 1" }} output="ok" />
      <ToolCallCard name="render_chart" summary="bar chart" duration={820} />
    </ToolCallGroup>
  ),
};

export const GroupActive: StoryObj<typeof ToolCallGroup> = {
  tags: ["no-visual"],
  render: () => (
    <ToolCallGroup active>
      <ToolCallCard name="search_skills" summary="2 matches" duration={310} output={["sales", "pricing"]} />
      <ToolCallCard name="run_query" status="running" summary="Querying orders…" input={{ sql: "select * from orders" }} />
    </ToolCallGroup>
  ),
};

export const LiveTurn: StoryObj<typeof ToolCallCard> = {
  tags: ["no-visual"],
  render: () => {
    const [status, setStatus] = useState<"running" | "done">("running");
    return (
      <div className="flex flex-col gap-2">
        <button type="button" className="self-start rounded-md border px-3 py-1 text-sm" onClick={() => setStatus(status === "running" ? "done" : "running")}>
          Mark {status === "running" ? "done" : "running"}
        </button>
        <ToolCallCard name="run_query" status={status} duration={status === "done" ? 900 : undefined} input={{ sql: "select 1" }} output={status === "done" ? "1 row" : undefined} />
      </div>
    );
  },
};
