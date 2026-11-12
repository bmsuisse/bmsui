import { EllipsisHorizontalIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  ActionsMenu,
  BooleanEditor,
  type BooleanColumn,
  DateEditor,
  type DateColumn,
  EditFieldError,
  EditingBar,
  EnumEditor,
  type EnumColumn,
  MultilineStringEditor,
  NumberEditor,
  type NumberColumn,
  StringEditor,
  type StringColumn,
} from "@bmsuisse/datagrid";

// The building blocks DataGrid renders itself: the cell editors, the Save/Discard bar and the
// row-actions menu. Shown on their own so they can be restyled and tested in isolation.
const meta: Meta = { title: "DataGrid/Parts", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

interface Row {
  id: string;
}

const stringColumn: StringColumn<Row> = { id: "name", type: "string", header: "Name", accessorKey: "id" };
const numberColumn: NumberColumn<Row> = { id: "qty", type: "number", header: "Quantity", accessorKey: "id" };
const dateColumn: DateColumn<Row> = { id: "due", type: "date", header: "Due", accessorKey: "id" };
const booleanColumn: BooleanColumn<Row> = { id: "done", type: "boolean", header: "Done", accessorKey: "id" };
const enumColumn: EnumColumn<Row> = {
  id: "status",
  type: "enum",
  header: "Status",
  accessorKey: "id",
  options: [
    { value: "open", label: "Open" },
    { value: "paid", label: "Paid" },
  ],
};

/** The default editor per column type, as it appears in an activated row. */
export const Editors: Story = {
  render: () => {
    const [name, setName] = useState<unknown>("Acme AG");
    const [note, setNote] = useState<unknown>("Line one\nLine two");
    const [qty, setQty] = useState<unknown>(12);
    const [due, setDue] = useState<unknown>(new Date(2026, 10, 12));
    const [done, setDone] = useState<unknown>(true);
    const [status, setStatus] = useState<unknown>("open");
    return (
      <div className="grid w-96 gap-3">
        <StringEditor column={stringColumn} rowId="1" value={name} onChange={setName} />
        <MultilineStringEditor column={stringColumn} rowId="2" value={note} onChange={setNote} />
        <NumberEditor column={numberColumn} rowId="1" value={qty} onChange={setQty} />
        <DateEditor column={dateColumn} rowId="1" value={due} onChange={setDue} />
        <BooleanEditor column={booleanColumn} rowId="1" value={done} onChange={setDone} />
        <EnumEditor column={enumColumn} rowId="1" value={status} onChange={setStatus} />
      </div>
    );
  },
};

/** Every editor shows its `validateEdit` message under the control and marks it invalid. */
export const EditorError: Story = {
  render: () => (
    <div className="w-72 space-y-1">
      <NumberEditor column={numberColumn} rowId="1" value={-3} onChange={() => {}} error="Must be 0 or more" />
      <EditFieldError id="standalone-error" message="Standalone error text" />
    </div>
  ),
};

/** The bar above a grid once an edit is pending; Save is blocked while a row has a validation error. */
export const SaveBar: Story = {
  render: () => (
    <div className="space-y-3">
      <EditingBar editing={{ onSave: async () => {} }} pendingRowCount={2} editErrors={new Map()} onSave={() => {}} onDiscard={() => {}} />
      <EditingBar
        editing={{ onSave: async () => {} }}
        pendingRowCount={1}
        editErrors={new Map([["1002", new Map([["qty", "Must be 0 or more"]])]])}
        onSave={() => {}}
        onDiscard={() => {}}
      />
    </div>
  ),
};

/** The per-row kebab menu (rowActions) and the toolbar menu (headerActions) share this component. */
export const Actions: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <ActionsMenu<Row>
        triggerLabel="Row actions"
        ctx={{ row: { id: "1001" } }}
        items={[
          { id: "open", label: "Open", icon: EllipsisHorizontalIcon, onSelect: () => {} },
          { id: "archive", label: "Archive", disabled: () => true, onSelect: () => {} },
          { id: "delete", label: "Delete", icon: TrashIcon, danger: true, onSelect: () => {} },
        ]}
      />
    </div>
  ),
};
