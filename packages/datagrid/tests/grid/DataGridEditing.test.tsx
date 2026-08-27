import { render, screen, waitFor } from "@testing-library/react";
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

  it("activating a second row deactivates the first — at most one row in edit mode at a time", async () => {
    render(<EditableGrid onSave={vi.fn()} />);

    await activateCell("1", "name");
    expect(screen.getByTestId("edit-1-name")).toBeInTheDocument();

    await activateCell("2", "name");

    expect(screen.getByTestId("edit-2-name")).toBeInTheDocument();
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charlie");
  });

  it("switching to another row keeps the first row's pending edit (just no longer shown as an editor)", async () => {
    render(<EditableGrid onSave={vi.fn()} />);
    await activateCell("1", "name");

    const nameInput = screen.getByTestId("edit-1-name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Charles");

    await activateCell("2", "name"); // switch away without saving

    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charles"); // pending edit still reflected
    expect(screen.getByTestId("datagrid-edit-bar")).toHaveTextContent("1 row changed");
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
    // Names the affected row(s), not just a generic "something's wrong" message.
    expect(screen.getByTestId("datagrid-edit-bar")).toHaveTextContent(
      "Fix the highlighted errors before saving (row 1).",
    );
    // The error text is wired up via aria-describedby, not just aria-invalid.
    const nameInputEl = screen.getByTestId("edit-1-name");
    const describedBy = nameInputEl.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Name is required");

    await userEvent.type(nameInput, "Charles");

    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    expect(screen.getByTestId("datagrid-save-edits")).not.toBeDisabled();
    expect(screen.getByTestId("edit-1-name")).not.toHaveAttribute("aria-describedby");
  });

  it("Escape reverts just the focused cell to its original value, leaving the row active and other cells' edits intact", async () => {
    render(<EditableGrid onSave={vi.fn()} />);
    await activateCell("1", "name");

    const nameInput = screen.getByTestId("edit-1-name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Charles");
    await userEvent.type(screen.getByTestId("edit-1-age"), "1"); // -> "301", a second pending edit on the same row

    await userEvent.type(nameInput, "{Escape}");

    expect(nameInput).toHaveValue("Charlie"); // reverted
    expect(screen.getByTestId("edit-1-name")).toBeInTheDocument(); // row stays active
    expect(screen.getByTestId("edit-1-age")).toHaveValue(301); // untouched by the other cell's Escape
    expect(screen.getByTestId("datagrid-edit-bar")).toHaveTextContent("1 row changed"); // age edit alone still pending
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

  it("keeps a decimal point visible while typing it, and commits the full decimal value", async () => {
    // Regression test for a real bug: deriving the number input's displayed
    // `value` straight from `String(parsedNumber)` loses an in-progress
    // decimal point or leading minus sign, because a native
    // `type="number"` input's own `.value` reads back as `""` while the
    // typed text isn't yet a complete valid float — feeding that back
    // through a controlled `value` prop wipes what the user just typed.
    const onSave = vi.fn();
    render(<EditableGrid onSave={onSave} />);
    await activateCell("1", "age");

    const ageInput = screen.getByTestId("edit-1-age");
    await userEvent.clear(ageInput);
    await userEvent.type(ageInput, "12.5");

    expect(ageInput).toHaveValue(12.5);
    await userEvent.click(screen.getByTestId("datagrid-save-edits"));

    const edits = onSave.mock.calls[0]![0] as EditedRow<Row>[];
    expect(edits[0]!.values.age).toBe(12.5);
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

  it("keeps an edit made while Save is still in flight, instead of wiping it once the save resolves", async () => {
    let resolveSave: () => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
    render(<EditableGrid onSave={onSave} />);
    await activateCell("1", "name");

    const nameInput = screen.getByTestId("edit-1-name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Charles");

    await userEvent.click(screen.getByTestId("datagrid-save-edits"));
    expect(onSave).toHaveBeenCalledTimes(1); // in flight, not yet resolved

    // A second edit — on a different column of the SAME row — lands while
    // the first save is still awaiting `onSave`. Nothing disables this row's
    // inputs during the save (that's opt-in via `editing.saving`), so this
    // is a legitimate thing for a user to do.
    const ageInput = screen.getByTestId("edit-1-age");
    await userEvent.clear(ageInput);
    await userEvent.type(ageInput, "99");

    resolveSave();
    await waitFor(() => expect(screen.getByTestId("edit-1-age")).toHaveValue(99));

    // The name edit (included in the resolved save) is gone; the age edit
    // (made during the await, never part of that save) must survive.
    expect(screen.getByTestId("datagrid-edit-bar")).toHaveTextContent("1 row changed");
    expect(screen.getByTestId("edit-1-age")).toHaveValue(99);
  });

  it("Escape closes an open enum dropdown without reverting the cell's already-changed value", async () => {
    render(<EditableGrid onSave={vi.fn()} />);
    await activateCell("1", "status");

    await userEvent.click(screen.getByTestId("edit-1-status"));
    await userEvent.click(await screen.findByRole("option", { name: "Shipped" }));
    expect(screen.getByTestId("edit-1-status")).toHaveTextContent("Shipped");

    // Reopen the dropdown, then Escape just to close IT — not to revert the
    // cell. Radix's own dismiss-on-Escape handling doesn't stopPropagation,
    // so without the DOM-containment guard in DataGrid.tsx, this would also
    // revert the cell back to "Pending".
    await userEvent.click(screen.getByTestId("edit-1-status"));
    await screen.findByRole("listbox");
    await userEvent.keyboard("{Escape}");

    expect(screen.getByTestId("edit-1-status")).toHaveTextContent("Shipped");
  });

  it("preserves seconds when editing a datetime column, instead of silently truncating to minute precision", async () => {
    const onSave = vi.fn();
    interface DatetimeRow {
      id: string;
      startedAt: string;
    }
    const datetimeColumns: ColumnDef<DatetimeRow>[] = [
      { id: "startedAt", type: "datetime", header: "Started", accessorKey: "startedAt", editable: true },
    ];
    render(
      <DataGrid
        columns={datetimeColumns}
        dataSource={{ mode: "client", data: [{ id: "1", startedAt: "2026-01-15T10:15:42" }] }}
        getRowId={(row) => row.id}
        showPagination={false}
        editing={{ onSave }}
      />,
    );
    await activateCell("1", "startedAt");

    // Change only the date portion — the input's own value must already
    // include the original seconds, or this round-trip truncates them.
    const input = screen.getByTestId("edit-1-startedAt");
    await userEvent.clear(input);
    await userEvent.type(input, "2026-01-16T10:15:42");
    await userEvent.click(screen.getByTestId("datagrid-save-edits"));

    const edits = onSave.mock.calls[0]![0] as EditedRow<DatetimeRow>[];
    const value = edits[0]!.values.startedAt as Date;
    expect(value.getSeconds()).toBe(42);
  });
});
