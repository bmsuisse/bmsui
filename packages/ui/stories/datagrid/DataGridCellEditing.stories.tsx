import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { type CellChange, type ColumnDef, DataGrid } from "@bmsuisse/datagrid";

// Spreadsheet-style editing (`cellEditing`): click a cell to edit it directly, drag or shift+arrow
// to select a range, Ctrl/Cmd+C and +V to copy and paste (one copied value fills the whole
// selection), and drag the small square at the selection's corner to fill adjacent cells. Every
// change applies immediately, no Save button. Unlike `editing`, which collects edits and saves.
const meta: Meta = { title: "DataGrid/CellEditing", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

interface Task {
  id: string;
  title: string;
  owner: string;
  hours: number;
  done: boolean;
}

const TASKS: Task[] = [
  { id: "1", title: "Draft Q3 roadmap", owner: "alice", hours: 6, done: false },
  { id: "2", title: "Fix flaky checkout test", owner: "bob", hours: 2, done: true },
  { id: "3", title: "Review vendor contract", owner: "carol", hours: 3, done: false },
  { id: "4", title: "Update onboarding docs", owner: "alice", hours: 4, done: false },
  { id: "5", title: "Triage support backlog", owner: "bob", hours: 5, done: false },
];

const taskColumns: ColumnDef<Task>[] = [
  // Not `editable`: selectable and copyable like any cell, but never opens an editor.
  { id: "id", type: "string", header: "ID", accessorKey: "id" },
  {
    id: "title",
    type: "string",
    header: "Task",
    accessorKey: "title",
    editable: true,
    validateEdit: (value) => (typeof value === "string" && value.trim() === "" ? "Title is required" : undefined),
  },
  {
    id: "owner",
    type: "enum",
    header: "Owner",
    accessorKey: "owner",
    editable: true,
    options: [
      { value: "alice", label: "Alice" },
      { value: "bob", label: "Bob" },
      { value: "carol", label: "Carol" },
    ],
  },
  { id: "hours", type: "number", header: "Est. hours", accessorKey: "hours", editable: true },
  { id: "done", type: "boolean", header: "Done", accessorKey: "done", editable: true },
];

/** A paste or fill spanning several columns of one row arrives as several changes sharing a row id: merge them all. */
function applyChanges<T extends { id: string }>(rows: T[], changes: CellChange<T>[]): T[] {
  return rows.map((row) => {
    const mine = changes.filter((change) => change.rowId === row.id);
    return mine.length === 0 ? row : { ...row, ...Object.fromEntries(mine.map((c) => [c.columnId, c.value])) };
  });
}

export const Spreadsheet: Story = {
  render: () => {
    const [tasks, setTasks] = useState(TASKS);
    return (
      <DataGrid
        columns={taskColumns}
        dataSource={{ mode: "client", data: tasks }}
        getRowId={(row) => row.id}
        showPagination={false}
        cellEditing={{ onCellsChange: (changes) => setTasks((prev) => applyChanges(prev, changes)) }}
      />
    );
  },
};

/** `cellEditing.alwaysEdit`: every editable cell shows its editor all the time. */
export const AlwaysEdit: Story = {
  render: () => {
    const [tasks, setTasks] = useState(TASKS);
    return (
      <DataGrid
        columns={taskColumns}
        dataSource={{ mode: "client", data: tasks }}
        getRowId={(row) => row.id}
        showPagination={false}
        cellEditing={{ alwaysEdit: true, onCellsChange: (changes) => setTasks((prev) => applyChanges(prev, changes)) }}
      />
    );
  },
};

interface StockRow {
  id: string;
  sku: string;
  category: string;
  warehouse: string;
  supplier: string;
  region: string;
  qty: number;
  status: string;
}

const STOCK: StockRow[] = [
  { id: "1", sku: "SKU-1001", category: "Fasteners", warehouse: "North DC", supplier: "Acme Corp", region: "EMEA", qty: 120, status: "In stock" },
  { id: "2", sku: "SKU-1002", category: "Adhesives", warehouse: "South DC", supplier: "Globex", region: "APAC", qty: 0, status: "Low stock" },
  { id: "3", sku: "SKU-1003", category: "Fasteners", warehouse: "East DC", supplier: "Initech", region: "AMER", qty: 45, status: "In stock" },
];

const stockColumns: ColumnDef<StockRow>[] = [
  { id: "sku", type: "string", header: "SKU", accessorKey: "sku", width: 120, pinned: "left", editable: true },
  { id: "category", type: "string", header: "Category", accessorKey: "category", width: 140, editable: true },
  { id: "warehouse", type: "string", header: "Warehouse", accessorKey: "warehouse", width: 140, editable: true },
  { id: "supplier", type: "string", header: "Supplier", accessorKey: "supplier", width: 140, editable: true },
  { id: "region", type: "string", header: "Region", accessorKey: "region", width: 140, editable: true },
  { id: "qty", type: "number", header: "Qty", accessorKey: "qty", width: 100, editable: true },
  { id: "status", type: "string", header: "Status", accessorKey: "status", width: 140, pinned: "right", editable: true },
];

/** Pinned columns on both sides: scroll sideways, then select a range across a pinned and a scrolled column; the selection overlay stays aligned. */
export const PinnedColumns: Story = {
  render: () => {
    const [rows, setRows] = useState(STOCK);
    return (
      <div className="max-w-lg">
        <DataGrid
          columns={stockColumns}
          dataSource={{ mode: "client", data: rows }}
          getRowId={(row) => row.id}
          showPagination={false}
          enableColumnResizing
          cellEditing={{ onCellsChange: (changes) => setRows((prev) => applyChanges(prev, changes)) }}
        />
      </div>
    );
  },
};
