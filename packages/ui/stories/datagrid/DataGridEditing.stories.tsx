import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { type ColumnDef, DataGrid } from "@bmsuisse/datagrid";

const meta: Meta = { title: "DataGrid/DataGridEditing", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

interface Task {
  id: string;
  title: string;
  owner: string;
  hours: number;
  done: boolean;
  due: string;
}

const owners = [
  { value: "anna", label: "Anna" },
  { value: "ben", label: "Ben" },
  { value: "chiara", label: "Chiara" },
];

const initialTasks: Task[] = [
  { id: "t1", title: "Write release notes", owner: "anna", hours: 3, done: false, due: "2026-12-01" },
  { id: "t2", title: "Review pull requests", owner: "ben", hours: 5, done: true, due: "2026-11-20" },
  { id: "t3", title: "Update dependencies", owner: "chiara", hours: 2.5, done: false, due: "2026-12-15" },
  { id: "t4", title: "Fix flaky e2e test", owner: "ben", hours: 8, done: false, due: "2026-11-30" },
  { id: "t5", title: "Plan sprint", owner: "anna", hours: 1, done: true, due: "2026-11-18" },
];

const columns: ColumnDef<Task>[] = [
  {
    id: "title",
    type: "string",
    header: "Task",
    accessorKey: "title",
    editable: true,
    validateEdit: (value) => (typeof value === "string" && value.trim() === "" ? "Title is required" : undefined),
  },
  { id: "owner", type: "enum", header: "Owner", accessorKey: "owner", editable: true, options: owners },
  {
    id: "hours",
    type: "number",
    header: "Est. hours",
    accessorKey: "hours",
    editable: true,
    validateEdit: (value) => (typeof value === "number" && value < 0 ? "Must not be negative" : undefined),
  },
  { id: "done", type: "boolean", header: "Done", accessorKey: "done", editable: (row) => row.owner !== "chiara" },
  { id: "due", type: "date", header: "Due", accessorKey: "due", editable: true },
];

/**
 * Click a cell to turn its row into editors. Edits accumulate until Save; clear the title or
 * enter a negative number to see `validateEdit` block Save. "Done" is not editable for Chiara's tasks.
 */
export const InlineEditing: Story = {
  render: function Render() {
    const [tasks, setTasks] = useState(initialTasks);
    const [saving, setSaving] = useState(false);
    return (
      <DataGrid
        columns={columns.map((c) => (c.id === "done" ? { ...c, editable: true } : c))}
        dataSource={{ mode: "client", data: tasks }}
        getRowId={(row) => row.id}
        showPagination={false}
        editing={{
          saving,
          onSave: (edits) =>
            new Promise<void>((resolve) => {
              setSaving(true);
              setTimeout(() => {
                setTasks((prev) =>
                  prev.map((task) => {
                    const edit = edits.find((e) => e.rowId === task.id);
                    return edit ? ({ ...task, ...edit.values } as Task) : task;
                  }),
                );
                setSaving(false);
                resolve();
              }, 600);
            }),
        }}
      />
    );
  },
};

/** Per-row `editable` predicate, custom button labels and an `onDiscard` hook. */
export const ConditionalEditableAndLabels: Story = {
  render: function Render() {
    const [tasks, setTasks] = useState(initialTasks);
    return (
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: tasks }}
        getRowId={(row) => row.id}
        showPagination={false}
        editing={{
          saveLabel: (n) => `Apply ${n} change${n === 1 ? "" : "s"}`,
          discardLabel: "Revert all",
          onDiscard: () => console.log("discarded"),
          onSave: (edits) =>
            setTasks((prev) =>
              prev.map((task) => {
                const edit = edits.find((e) => e.rowId === task.id);
                return edit ? ({ ...task, ...edit.values } as Task) : task;
              }),
            ),
        }}
      />
    );
  },
};

/** A rejected `onSave` keeps every pending edit in place. */
export const SaveFails: Story = {
  render: () => (
    <DataGrid
      columns={columns}
      dataSource={{ mode: "client", data: initialTasks }}
      getRowId={(row) => row.id}
      showPagination={false}
      editing={{
        onSave: async () => {
          await new Promise((r) => setTimeout(r, 400));
          throw new Error("Server rejected the change");
        },
      }}
    />
  ),
};
