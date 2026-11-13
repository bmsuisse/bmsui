import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DataGrid } from "@bmsuisse/datagrid";
import { Button } from "@bmsuisse/ui";
import { type Order, getOrderId, orderColumns, orders } from "./sampleData";

const meta: Meta = { title: "DataGrid/DataGridSelection", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

const data = orders.slice(0, 15);
const source = { mode: "client" as const, data };

/** Checkbox per row + select-all, bulk menu through `headerActions`. */
export const MultipleWithBulkActions: Story = {
  render: () => (
    <DataGrid
      columns={orderColumns}
      dataSource={source}
      getRowId={getOrderId}
      headerActions={[
        { id: "export", label: "Export selected", disabled: (ctx) => !ctx.selectedRows?.length, onSelect: (ctx) => alert(`Export ${ctx.selectedRows?.length} rows`) },
        { id: "delete", label: "Delete selected", danger: true, disabled: (ctx) => !ctx.selectedRows?.length, onSelect: (ctx) => alert(`Delete ${ctx.selectedRows?.length} rows`) },
      ]}
    />
  ),
};

/** `selectedIds`/`onSelectedIdsChange`: build your own toolbar outside the grid. */
export const ControlledSelection: Story = {
  render: function Render() {
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(["1002", "1004"]));
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm">{selected.size} selected</span>
          <Button variant="outline" size="sm" disabled={selected.size === 0} onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
        <DataGrid columns={orderColumns} dataSource={source} getRowId={getOrderId} selectedIds={selected} onSelectedIdsChange={setSelected} />
      </div>
    );
  },
};

/** Radio per row; at most one id in the set. */
export const SingleSelection: Story = {
  render: function Render() {
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(["1003"]));
    return (
      <div className="space-y-3">
        <p className="text-sm">Selected: {[...selected].join(", ") || "none"}</p>
        <DataGrid columns={orderColumns} dataSource={source} getRowId={getOrderId} selectionMode="single" selectedIds={selected} onSelectedIdsChange={setSelected} />
      </div>
    );
  },
};

/** Per-row kebab menu. */
export const RowActions: Story = {
  render: () => (
    <DataGrid
      columns={orderColumns}
      dataSource={source}
      getRowId={getOrderId}
      rowActions={[
        { id: "open", label: "Open", onSelect: (ctx) => alert(`Open ${ctx.row?.id}`) },
        { id: "pay", label: "Mark as paid", visible: (ctx) => ctx.row?.status !== "paid", onSelect: (ctx) => alert(`Paid ${ctx.row?.id}`) },
        { id: "delete", label: "Delete", danger: true, onSelect: (ctx) => alert(`Delete ${ctx.row?.id}`) },
      ]}
    />
  ),
};

/** Expand a row to show more. Several rows can be open at once. */
export const ExpandableDetail: Story = {
  render: () => (
    <DataGrid
      columns={orderColumns}
      dataSource={source}
      getRowId={getOrderId}
      renderDetail={(row: Order) => (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <dt className="text-muted-foreground">Order</dt>
          <dd>{row.id}</dd>
          <dt className="text-muted-foreground">Customer</dt>
          <dd>{row.customer}</dd>
          <dt className="text-muted-foreground">Region</dt>
          <dd>{row.region}</dd>
          <dt className="text-muted-foreground">Quantity</dt>
          <dd>{row.qty}</dd>
        </dl>
      )}
    />
  ),
};

/** `getRowProps` (clickable rows, `data-*`), `activeRowId`/`onActiveRowChange` and `cellClassName`. */
export const RowStyling: Story = {
  render: function Render() {
    const [active, setActive] = useState<string | null>("1002");
    const [clicked, setClicked] = useState<string>("nothing");
    const columns = orderColumns.map((c) => (c.id === "amount" ? { ...c, cellClassName: "bg-amber-50 font-medium dark:bg-amber-950/30" } : c));
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Active row: {active ?? "none"}. Last click handler: {clicked}.</p>
        <DataGrid
          columns={columns}
          dataSource={source}
          getRowId={getOrderId}
          activeRowId={active}
          onActiveRowChange={setActive}
          getRowProps={(row) => ({
            onClick: () => setClicked(row.id),
            className: row.status === "overdue" ? "cursor-pointer text-red-700 dark:text-red-300" : "cursor-pointer",
            "data-order-status": row.status,
          })}
        />
      </div>
    );
  },
};
