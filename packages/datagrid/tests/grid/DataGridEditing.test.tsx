import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef, EditedRow } from "../../src";
import { DataGrid } from "../../src/grid/DataGrid";

interface Row {
  id: string;
  name: string;
  age: number;
  active: boolean;
  status: string;
  joined: string;
}

const rows: Row[] = [
  { id: "1", name: "Charlie", age: 30, active: true, status: "pending", joined: "2026-01-15" },
  { id: "2", name: "Alice", age: 25, active: false, status: "shipped", joined: "2026-02-20" },
];

const columns: ColumnDef<Row>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name", editable: true },
  { id: "age", type: "number", header: "Age", accessorKey: "age", editable: true },
  { id: "active", type: "boolean", header: "Active", accessorKey: "active", editable: true },
  {
    id: "status",
    type: "enum",
    header: "Status",
    accessorKey: "status",
    editable: true,
    options: [
      { value: "pending", label: "Pending" },
      { value: "shipped", label: "Shipped" },
    ],
  },
  { id: "joined", type: "date", header: "Joined", accessorKey: "joined", editable: true },
];

/** Clicks a not-yet-activated cell's static content, entering that row's edit mode. */
async function activateCell(rowId: string, columnId: string): Promise<void> {
  await userEvent.click(screen.getByTestId(`cell-${rowId}-${columnId}`));
}

/** A stateful harness mirroring real usage: `onSave` actually applies edits back onto `data`. */
function EditableGrid({
  onSave,
  onDiscard,
  validateEdit,
  saving,
  columnsOverride,
}: {
  onSave: (edits: EditedRow<Row>[]) => void | Promise<void>;
  onDiscard?: () => void;
  validateEdit?: (value: unknown, row: Row) => string | undefined;
  saving?: boolean;
  columnsOverride?: ColumnDef<Row>[];
}): ReactElement {
  const [data, setData] = useState(rows);
  const cols = columnsOverride ?? (validateEdit ? [{ ...columns[0]!, validateEdit }, ...columns.slice(1)] : columns);
  return (
    <DataGrid
      columns={cols}
      dataSource={{ mode: "client", data }}
      getRowId={(row) => row.id}
      showPagination={false}
      editing={{
        onSave: async (edits) => {
          await onSave(edits);
          setData((prev) =>
            prev.map((row) => {
              const edit = edits.find((e) => e.rowId === row.id);
              return edit ? { ...row, ...edit.values } : row;
            }),
          );
        },
        onDiscard,
        saving,
      }}
    />
  );
}

describe("DataGrid inline editing", () => {
  it("renders editable columns as static (clickable) text until clicked, non-editable columns as plain text", () => {
    render(
      <DataGrid
        columns={[columns[0]!, { id: "age", type: "number", header: "Age", accessorKey: "age" }]}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        editing={{ onSave: vi.fn() }}
      />,
    );

    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charlie");
    expect(screen.getByRole("cell", { name: "30" })).toBeInTheDocument();
  });

  it("falls back to static rendering when no `editing` prop is supplied, even for an editable column", () => {
    render(<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);

    expect(screen.queryByTestId("cell-1-name")).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Charlie" })).toBeInTheDocument();
  });

  it("clicking one editable cell activates every editable column in that row, but no other row", async () => {
    render(<EditableGrid onSave={vi.fn()} />);

    await activateCell("1", "name");

    expect(screen.getByTestId("edit-1-name")).toBeInTheDocument();
    expect(screen.getByTestId("edit-1-age")).toBeInTheDocument();
    expect(screen.getByTestId("edit-1-active")).toBeInTheDocument();
    expect(screen.getByTestId("edit-1-status")).toBeInTheDocument();
    expect(screen.getByTestId("edit-1-joined")).toBeInTheDocument();

    // Row 2 stays fully static.
    expect(screen.queryByTestId("edit-2-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-2-name")).toHaveTextContent("Alice");
  });

  it("focuses the specific cell that was clicked, not just some other cell in the activated row", async () => {
    render(<EditableGrid onSave={vi.fn()} />);

    await activateCell("1", "age");

    expect(screen.getByTestId("edit-1-age")).toHaveFocus();
    expect(screen.getByTestId("edit-1-name")).not.toHaveFocus();
  });

  it("activating a second row keeps the first row's editors active too (accumulate, not replace)", async () => {
    render(<EditableGrid onSave={vi.fn()} />);

    await activateCell("1", "name");
    await activateCell("2", "name");

    expect(screen.getByTestId("edit-1-name")).toBeInTheDocument();
    expect(screen.getByTestId("edit-2-name")).toBeInTheDocument();
  });

  it("Enter/Space on a static cell activates its row too (keyboard-reachable)", async () => {
    render(<EditableGrid onSave={vi.fn()} />);

    screen.getByTestId("cell-1-name").focus();
    await userEvent.keyboard("{Enter}");

    expect(screen.getByTestId("edit-1-name")).toBeInTheDocument();
  });

  it("shows the Save bar once a value changes, and hides it again once reverted to the original", async () => {
    render(<EditableGrid onSave={vi.fn()} />);
    await activateCell("1", "name");

    expect(screen.queryByTestId("datagrid-edit-bar")).not.toBeInTheDocument();

    const nameInput = screen.getByTestId("edit-1-name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Charles");

    expect(screen.getByTestId("datagrid-edit-bar")).toHaveTextContent("1 row changed");
    expect(screen.getByTestId("datagrid-save-edits")).toHaveTextContent("Save 1 change");

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Charlie");

    expect(screen.queryByTestId("datagrid-edit-bar")).not.toBeInTheDocument();
  });

  it("calls onSave with the changed rows/values on Save, then clears pending state and deactivates the saved row", async () => {
    const onSave = vi.fn();
    render(<EditableGrid onSave={onSave} />);
    await activateCell("1", "name");

    const nameInput = screen.getByTestId("edit-1-name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Charles");

    await userEvent.click(screen.getByTestId("datagrid-save-edits"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const edits = onSave.mock.calls[0]![0] as EditedRow<Row>[];
    expect(edits).toEqual([{ rowId: "1", row: rows[0], values: { name: "Charles" } }]);

    expect(screen.queryByTestId("datagrid-edit-bar")).not.toBeInTheDocument();
    // Row 1 deactivates back to static display once its edits are saved.
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charles");
  });

  it("keeps pending edits, the Save bar, and the row active when onSave rejects", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("server said no"));
    render(<EditableGrid onSave={onSave} />);
    await activateCell("1", "name");

    const nameInput = screen.getByTestId("edit-1-name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Charles");
    await userEvent.click(screen.getByTestId("datagrid-save-edits"));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("datagrid-edit-bar")).toBeInTheDocument();
    expect(screen.getByTestId("edit-1-name")).toHaveValue("Charles");
  });

  it("Discard clears every pending edit, deactivates every row, reverts the display, and calls onDiscard", async () => {
    const onDiscard = vi.fn();
    render(<EditableGrid onSave={vi.fn()} onDiscard={onDiscard} />);
    await activateCell("1", "name");

    const nameInput = screen.getByTestId("edit-1-name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Charles");

    await userEvent.click(screen.getByTestId("datagrid-discard-edits"));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("datagrid-edit-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charlie");
  });

  it("disables Save (but not typing) while a column's validateEdit fails, until fixed", async () => {
    render(<EditableGrid onSave={vi.fn()} validateEdit={(value) => (value === "" ? "Name is required" : undefined)} />);
    await activateCell("1", "name");

    const nameInput = screen.getByTestId("edit-1-name");
    await userEvent.clear(nameInput);

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByTestId("datagrid-save-edits")).toBeDisabled();
    expect(screen.getByTestId("datagrid-edit-bar")).toHaveTextContent("Fix the highlighted errors before saving.");

    await userEvent.type(nameInput, "Charles");

    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    expect(screen.getByTestId("datagrid-save-edits")).not.toBeDisabled();
  });

  it("customizes the Save/Discard labels via a count-aware function, and via a plain string", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        editing={{
          onSave: vi.fn(),
          saveLabel: (count) => `Apply ${count} update${count === 1 ? "" : "s"}`,
          discardLabel: "Cancel",
        }}
      />,
    );
    await activateCell("1", "name");

    await userEvent.type(screen.getByTestId("edit-1-name"), "!");

    expect(screen.getByTestId("datagrid-save-edits")).toHaveTextContent("Apply 1 update");
    expect(screen.getByTestId("datagrid-discard-edits")).toHaveTextContent("Cancel");
  });

  it("disables Save/Discard while `saving` is true", async () => {
    render(<EditableGrid onSave={vi.fn()} saving />);
    await activateCell("1", "name");

    await userEvent.type(screen.getByTestId("edit-1-name"), "!");

    expect(screen.getByTestId("datagrid-save-edits")).toBeDisabled();
    expect(screen.getByTestId("datagrid-discard-edits")).toBeDisabled();
  });

  it("commits a real number, not a string, from the default number editor", async () => {
    const onSave = vi.fn();
    render(<EditableGrid onSave={onSave} />);
    await activateCell("1", "age");

    const ageInput = screen.getByTestId("edit-1-age");
    await userEvent.clear(ageInput);
    await userEvent.type(ageInput, "31");
    await userEvent.click(screen.getByTestId("datagrid-save-edits"));

    const edits = onSave.mock.calls[0]![0] as EditedRow<Row>[];
    expect(edits[0]!.values.age).toBe(31);
  });

  it("commits a real boolean from the default boolean editor", async () => {
    const onSave = vi.fn();
    render(<EditableGrid onSave={onSave} />);
    await activateCell("1", "active");

    await userEvent.click(screen.getByTestId("edit-1-active"));
    await userEvent.click(screen.getByTestId("datagrid-save-edits"));

    const edits = onSave.mock.calls[0]![0] as EditedRow<Row>[];
    expect(edits[0]!.values.active).toBe(false); // row 1 started active: true
  });

  it("commits the selected option's value from the default enum editor", async () => {
    const onSave = vi.fn();
    render(<EditableGrid onSave={onSave} />);
    await activateCell("1", "status");

    await userEvent.click(screen.getByTestId("edit-1-status"));
    await userEvent.click(await screen.findByRole("option", { name: "Shipped" }));
    await userEvent.click(screen.getByTestId("datagrid-save-edits"));

    const edits = onSave.mock.calls[0]![0] as EditedRow<Row>[];
    expect(edits[0]!.values.status).toBe("shipped");
  });

  it("commits a Date instance from the default date editor", async () => {
    const onSave = vi.fn();
    render(<EditableGrid onSave={onSave} />);
    await activateCell("1", "joined");

    const joinedInput = screen.getByTestId("edit-1-joined");
    await userEvent.clear(joinedInput);
    await userEvent.type(joinedInput, "2026-03-01");
    await userEvent.click(screen.getByTestId("datagrid-save-edits"));

    const edits = onSave.mock.calls[0]![0] as EditedRow<Row>[];
    const value = edits[0]!.values.joined;
    expect(value).toBeInstanceOf(Date);
    expect((value as Date).getFullYear()).toBe(2026);
    expect((value as Date).getMonth()).toBe(2); // 0-indexed: March
    expect((value as Date).getDate()).toBe(1);
  });

  it("uses a custom renderEditCell over the default widget when supplied", async () => {
    const onSave = vi.fn();
    const customColumns: ColumnDef<Row>[] = [
      {
        ...columns[0]!,
        renderEditCell: (value, row, onChange) => (
          <input
            data-testid={`custom-name-editor-${row.id}`}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(event) => onChange(event.target.value)}
          />
        ),
      },
    ];
    render(<EditableGrid onSave={onSave} columnsOverride={customColumns} />);
    await activateCell("1", "name");

    const input = screen.getByTestId("custom-name-editor-1");
    await userEvent.clear(input);
    await userEvent.type(input, "Charles");
    await userEvent.click(screen.getByTestId("datagrid-save-edits"));

    const edits = onSave.mock.calls[0]![0] as EditedRow<Row>[];
    expect(edits[0]!.values.name).toBe("Charles");
  });

  it("respects a per-row `editable` predicate", () => {
    const lockable: ColumnDef<Row>[] = [{ ...columns[0]!, editable: (row) => row.id !== "2" }];
    render(<EditableGrid onSave={vi.fn()} columnsOverride={lockable} />);

    expect(screen.getByTestId("cell-1-name")).toBeInTheDocument(); // row 1: editable (clickable)
    expect(screen.queryByTestId("cell-2-name")).not.toBeInTheDocument(); // row 2: locked, plain static text
    expect(screen.getByRole("cell", { name: "Alice" })).toBeInTheDocument();
  });
});
