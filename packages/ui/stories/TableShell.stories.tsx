import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ArrowDownTrayIcon, FunnelIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  Button,
  Pagination,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePage,
  TableResultCount,
  TableRow,
  TableSearch,
  TableShell,
  TableToolbar,
} from "@bmsuisse/ui";

const meta: Meta = {
  title: "Patterns/TableShell",
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

const ROWS = [
  { id: "OF-0312", customer: "Müller Haustechnik AG", status: "approved", total: "CHF 48'120" },
  { id: "OF-0311", customer: "Baumann Sanitär GmbH", status: "pending", total: "CHF 12'940" },
  { id: "OF-0310", customer: "Graf Bad & Küche", status: "draft", total: "CHF 7'310" },
  { id: "OF-0309", customer: "Steiner Bau AG", status: "rejected", total: "CHF 91'500" },
];

function Body({ rows }: { rows: typeof ROWS }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Offer</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">{r.id}</TableCell>
            <TableCell>{r.customer}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell className="text-right tabular-nums">{r.total}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function useFiltered() {
  const [query, setQuery] = useState("");
  const rows = ROWS.filter((r) => `${r.id} ${r.customer}`.toLowerCase().includes(query.toLowerCase()));
  return { query, setQuery, rows };
}

export const Default: Story = {
  render: () => {
    const { query, setQuery, rows } = useFiltered();
    return (
      <TableShell
        toolbar={
          <TableToolbar
            search={<TableSearch value={query} onChange={setQuery} placeholder="Search offers…" aria-label="Search offers" />}
            filters={<Button variant="outline" size="sm" className="rounded-full"><FunnelIcon /> Status</Button>}
            actions={<Button size="sm"><PlusIcon /> New</Button>}
          />
        }
        meta={<TableResultCount shown={rows.length} total={ROWS.length} />}
      >
        <Body rows={rows} />
      </TableShell>
    );
  },
};

export const WithFooter: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <TableShell
        meta={<TableResultCount shown={312} total={312} />}
        footer={<Pagination page={page} onPageChange={setPage} totalItems={312} pageSize={25} />}
      >
        <Body rows={ROWS} />
      </TableShell>
    );
  },
};

export const Flush: Story = {
  render: () => (
    <div className="rounded-xl border border-border p-2">
      <TableShell flush meta={<TableResultCount shown={ROWS.length} total={ROWS.length} />}>
        <Body rows={ROWS} />
      </TableShell>
    </div>
  ),
};

export const Page: Story = {
  parameters: { layout: "fullscreen" },
  render: () => {
    const { query, setQuery, rows } = useFiltered();
    return (
      <div className="h-[560px] p-4">
        <TablePage
          title="Offers"
          description="All offers of your team, newest first."
          actions={<Button variant="outline" size="sm"><ArrowDownTrayIcon /> Export</Button>}
          toolbar={<TableToolbar search={<TableSearch value={query} onChange={setQuery} placeholder="Search…" aria-label="Search" />} />}
          meta={<TableResultCount shown={rows.length} total={ROWS.length} />}
        >
          <Body rows={rows} />
        </TablePage>
      </div>
    );
  },
};
