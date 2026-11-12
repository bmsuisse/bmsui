import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useState } from "react";
import { type ColumnDef, DataGrid } from "@bmsuisse/datagrid";
import { type Order, getOrderId, makeOrders, orderColumns } from "./sampleData";

const meta: Meta = { title: "DataGrid/DataGridGrouping", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

const chf = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" });
const sum = (rows: Order[], key: "amount" | "qty") => rows.reduce((total, r) => total + r[key], 0);

const summaryColumns: ColumnDef<Order>[] = orderColumns.map((c) => {
  if (c.id === "amount") return { ...c, summary: (rows: Order[]) => chf.format(sum(rows, "amount")) };
  if (c.id === "qty") return { ...c, summary: (rows: Order[]) => sum(rows, "qty") };
  if (c.id === "id") return { ...c, summary: (rows: Order[]) => `${rows.length} orders` };
  return c;
});

const grouped = makeOrders(36);

/** One collapsible header per customer, with a subtotal row per group. */
export const GroupBySummary: Story = {
  render: () => (
    <DataGrid
      columns={summaryColumns}
      dataSource={{ mode: "client", data: grouped }}
      getRowId={getOrderId}
      groupBy={(row) => row.customer}
      renderGroupHeader={(key, rows, expanded) => `${expanded ? "▾" : "▸"} ${key} (${rows.length} orders, ${chf.format(sum(rows, "amount"))})`}
      showPagination={false}
    />
  ),
};

/** `showTotals` adds a sticky grand-total footer. */
export const ShowTotals: Story = {
  render: () => (
    <DataGrid
      columns={summaryColumns}
      dataSource={{ mode: "client", data: grouped.slice(0, 20) }}
      getRowId={getOrderId}
      showTotals
      showPagination={false}
      maxHeight={360}
    />
  ),
};

/** Group collapse state controlled from outside; groups start collapsed. */
export const GroupsCollapsedByDefault: Story = {
  render: function Render() {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ "Acme AG": true });
    return (
      <DataGrid
        columns={summaryColumns}
        dataSource={{ mode: "client", data: grouped }}
        getRowId={getOrderId}
        groupBy={(row) => row.region}
        defaultGroupsExpanded={false}
        expandedGroups={expanded}
        onExpandedGroupsChange={setExpanded}
        showTotals
        showPagination={false}
      />
    );
  },
};

const big = makeOrders(5000);

/** 5,000 rows, windowed; only a screenful of `<tr>` is in the DOM. */
export const Virtualized: Story = {
  render: () => (
    <DataGrid
      columns={orderColumns}
      dataSource={{ mode: "client", data: big }}
      getRowId={getOrderId}
      virtualize={{ maxBodyHeight: 420, estimatedRowHeight: 41 }}
      showPagination={false}
      initialState={{ pageSize: 5000 }}
    />
  ),
};

/** Infinite scroll: `onEndReached` appends the next batch. */
export const InfiniteScroll: Story = {
  render: function Render() {
    const [count, setCount] = useState(100);
    const more = useCallback(() => setCount((c) => Math.min(c + 100, big.length)), []);
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Loaded {count} of {big.length}</p>
        <DataGrid
          columns={orderColumns}
          dataSource={{ mode: "client", data: big.slice(0, count) }}
          getRowId={getOrderId}
          virtualize={{ maxBodyHeight: 420, threshold: 0, estimatedRowHeight: 41, onEndReached: more, hasMore: count < big.length }}
          showPagination={false}
          initialState={{ pageSize: 5000 }}
        />
      </div>
    );
  },
};

/** Grouping and virtualization together. */
export const GroupedVirtualized: Story = {
  render: () => (
    <DataGrid
      columns={summaryColumns}
      dataSource={{ mode: "client", data: big.slice(0, 1500) }}
      getRowId={getOrderId}
      groupBy={(row) => row.region}
      virtualize={{ maxBodyHeight: 420, estimatedRowHeight: 41 }}
      showPagination={false}
      initialState={{ pageSize: 1500 }}
    />
  ),
};
