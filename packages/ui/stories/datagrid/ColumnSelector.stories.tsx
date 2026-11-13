import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ColumnDef, ColumnSelector, type ColumnVisibility, DataGrid, usePersistedColumnSizing } from "@bmsuisse/datagrid";
import { useState } from "react";

interface Order {
  id: string;
  customer: string;
  status: string;
  amount: number;
  paid: boolean;
  created: string;
}

const ROWS: Order[] = [
  { id: "1001", customer: "Acme AG", status: "shipped", amount: 1290, paid: true, created: "2026-03-02" },
  { id: "1002", customer: "Bolt GmbH", status: "pending", amount: 450.5, paid: false, created: "2026-03-05" },
  { id: "1003", customer: "Cobalt SA", status: "delivered", amount: 3120, paid: true, created: "2026-03-09" },
  { id: "1004", customer: "Delta Tools", status: "cancelled", amount: 89, paid: false, created: "2026-03-11" },
];

const columns: ColumnDef<Order>[] = [
  { id: "id", type: "string", header: "Order", accessorKey: "id", group: "Details", width: 100 },
  { id: "customer", type: "string", header: "Customer", accessorKey: "customer", group: "Account", width: 160 },
  { id: "status", type: "string", header: "Status", accessorKey: "status", group: "Details", width: 120 },
  { id: "amount", type: "currency", header: "Amount", accessorKey: "amount", group: "Financial", width: 120 },
  { id: "paid", type: "boolean", header: "Paid", accessorKey: "paid", group: "Financial", width: 80 },
  { id: "created", type: "date", header: "Created", accessorKey: "created", group: "Details", width: 130 },
];

const meta: Meta = { title: "DataGrid/ColumnSelector", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const Grouped: Story = {
  render: () => {
    const [visibility, setVisibility] = useState<ColumnVisibility>({});
    return (
      <div className="flex flex-col gap-2">
        <div>
          <ColumnSelector columns={columns} visibility={visibility} onVisibilityChange={setVisibility} />
        </div>
        <DataGrid
          columns={columns}
          columnVisibility={visibility}
          dataSource={{ mode: "client", data: ROWS }}
          getRowId={(row) => row.id}
        />
      </div>
    );
  },
};

export const DragToReorder: Story = {
  render: () => {
    const [visibility, setVisibility] = useState<ColumnVisibility>({});
    const [order, setOrder] = useState<string[]>(() => columns.map((c) => c.id));
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Drag rows in the dialog; reordering stays within a group.</p>
        <div>
          <ColumnSelector
            columns={columns}
            visibility={visibility}
            onVisibilityChange={setVisibility}
            columnOrder={order}
            onColumnOrderChange={setOrder}
          />
        </div>
        <DataGrid
          columns={columns}
          columnVisibility={visibility}
          columnOrder={order}
          dataSource={{ mode: "client", data: ROWS }}
          getRowId={(row) => row.id}
        />
      </div>
    );
  },
};

export const PersistedWithReset: Story = {
  render: () => {
    const defaults: ColumnVisibility = { created: false };
    const [visibility, setVisibility] = useState<ColumnVisibility>(defaults);
    const [order, setOrder] = useState<string[]>(() => columns.map((c) => c.id));
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Visibility and order are stored in localStorage under this story's own key; Reset restores the defaults
          (Created hidden).
        </p>
        <div>
          <ColumnSelector
            columns={columns}
            visibility={visibility}
            onVisibilityChange={setVisibility}
            persistKey="storybook-column-selector-persisted"
            columnOrder={order}
            onColumnOrderChange={setOrder}
            defaultVisibility={defaults}
          />
        </div>
        <DataGrid
          columns={columns}
          columnVisibility={visibility}
          columnOrder={order}
          dataSource={{ mode: "client", data: ROWS }}
          getRowId={(row) => row.id}
        />
      </div>
    );
  },
};

export const PersistedColumnSizing: Story = {
  render: () => {
    const defaults: ColumnVisibility = { created: false };
    const sizing = usePersistedColumnSizing("storybook-column-sizing", columns);
    const [visibility, setVisibility] = useState<ColumnVisibility>(defaults);
    const [order, setOrder] = useState<string[]>(() => columns.map((c) => c.id));
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Drag a column edge to resize; widths survive a reload. Reset in the dialog also clears widths.
        </p>
        <div>
          <ColumnSelector
            columns={columns}
            visibility={visibility}
            onVisibilityChange={setVisibility}
            persistKey="storybook-column-sizing"
            columnOrder={order}
            onColumnOrderChange={setOrder}
            defaultVisibility={defaults}
            isCustomized={sizing.isCustomized}
            onReset={sizing.reset}
          />
        </div>
        <DataGrid
          columns={columns}
          columnVisibility={visibility}
          columnOrder={order}
          enableColumnResizing
          columnSizing={sizing.columnSizing}
          onColumnSizingChange={sizing.onColumnSizingChange}
          dataSource={{ mode: "client", data: ROWS }}
          getRowId={(row) => row.id}
        />
      </div>
    );
  },
};
