import type { ColumnDef } from "@bmsuisse/datagrid";

export type Status = "open" | "paid" | "overdue";

export interface Order {
  id: string;
  customer: string;
  region: string;
  status: Status;
  amount: number;
  qty: number;
  date: string;
  express: boolean;
}

const customers = ["Acme AG", "Bolt GmbH", "Cobalt SA", "Delta Tools", "Edelweiss Bau", "Fjord Metall"];
const regions = ["Zürich", "Bern", "Basel", "Genève"];
const statuses: Status[] = ["paid", "open", "overdue"];

/** Deterministic rows (no randomness): every field derives from the index. */
export function makeOrders(count: number): Order[] {
  return Array.from({ length: count }, (_, i) => {
    const day = (i * 7) % 28;
    const month = (i * 5) % 12;
    return {
      id: String(1001 + i),
      customer: customers[i % customers.length]!,
      region: regions[(i * 3) % regions.length]!,
      status: statuses[(i * 7) % statuses.length]!,
      amount: Math.round(((i * 7919) % 5000) * 100) / 100 + 40,
      qty: ((i * 13) % 40) + 1,
      date: `2026-${String(month + 1).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`,
      express: i % 3 === 0,
    };
  });
}

export const orders = makeOrders(60);

export const statusOptions = [
  { value: "open", label: "Open" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export const orderColumns: ColumnDef<Order>[] = [
  { id: "id", type: "string", header: "Order", accessorKey: "id", sortable: true },
  { id: "customer", type: "string", header: "Customer", accessorKey: "customer", sortable: true, filterable: true },
  { id: "region", type: "string", header: "Region", accessorKey: "region", sortable: true, filterable: true },
  { id: "status", type: "enum", header: "Status", accessorKey: "status", sortable: true, filterable: true, options: statusOptions },
  { id: "qty", type: "number", header: "Qty", accessorKey: "qty", sortable: true, filterable: true },
  { id: "amount", type: "currency", currency: "CHF", header: "Amount", accessorKey: "amount", sortable: true, filterable: true },
  { id: "date", type: "date", header: "Date", accessorKey: "date", sortable: true, filterable: true },
  { id: "express", type: "boolean", header: "Express", accessorKey: "express", sortable: true, filterable: true },
];

export const getOrderId = (row: Order) => row.id;
