import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CellChange, ColumnDef } from "../../src";
import { DataGrid } from "../../src/grid/DataGrid";

interface Row {
  id: string;
  name: string;
  age: number;
}

const rows: Row[] = [
  { id: "1", name: "Charlie", age: 30 },
  { id: "2", name: "Alice", age: 25 },
  { id: "3", name: "Bob", age: 40 },
];

const columns: ColumnDef<Row>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
  { id: "age", type: "number", header: "Age", accessorKey: "age" },
];

function cellAt(container: HTMLElement, rowId: string, columnId: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-cell-row="${rowId}"][data-cell-col="${columnId}"]`);
  if (!el) throw new Error(`no cell found for ${rowId}/${columnId}`);
  return el;
}

describe("DataGrid cellEditing — selection wiring", () => {
  it("without `cellEditing`, cells carry no data-cell-row/col attributes and no overlay ever renders", () => {
    const { container } = render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    expect(container.querySelector("[data-cell-row]")).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("datagrid"));
    expect(screen.queryByTestId("cell-selection-overlay")).not.toBeInTheDocument();
  });

  it("with `cellEditing`, cells carry data-cell-row/col attributes for every visible column", () => {
    const { container } = render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        cellEditing={{ onCellsChange: vi.fn() }}
      />,
    );
    expect(cellAt(container, "1", "name")).toBeInTheDocument();
    expect(cellAt(container, "1", "age")).toBeInTheDocument();
    expect(cellAt(container, "3", "age")).toBeInTheDocument();
  });

  it("clicking a cell selects it and renders the selection overlay", () => {
    const { container } = render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        cellEditing={{ onCellsChange: vi.fn() }}
      />,
    );
    expect(screen.queryByTestId("cell-selection-overlay")).not.toBeInTheDocument();
    fireEvent.mouseDown(cellAt(container, "2", "name"));
    expect(screen.getByTestId("cell-selection-overlay")).toBeInTheDocument();
  });

  it("mousedown then a mousemove bubbling from a different cell extends the range (a drag-select), and mouseup commits it", async () => {
    const { container } = render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        cellEditing={{ onCellsChange: vi.fn() }}
      />,
    );
    fireEvent.mouseDown(cellAt(container, "1", "name"));
    // The production drag listener is attached to `window`; dispatching on a
    // connected cell element bubbles the event up to it with `event.target`
    // set to that cell — exactly what `closest("[data-cell-row]")` needs.
    fireEvent.mouseMove(cellAt(container, "3", "age"));
    // The drag update is coalesced through one requestAnimationFrame; flush
    // it before asserting.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.mouseUp(window);
    expect(screen.getByTestId("cell-selection-overlay")).toBeInTheDocument();
  });

  it("a mousemove with no cell in its bubble path is ignored (no throw, no selection change) when no drag is in progress", () => {
    const { container } = render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        cellEditing={{ onCellsChange: vi.fn() }}
      />,
    );
    expect(() => fireEvent.mouseMove(window)).not.toThrow();
    expect(screen.queryByTestId("cell-selection-overlay")).not.toBeInTheDocument();
    // Selecting still works fine afterward.
    fireEvent.mouseDown(cellAt(container, "1", "name"));
    expect(screen.getByTestId("cell-selection-overlay")).toBeInTheDocument();
  });

  it("arrow-key navigation after a selection moves it without throwing or scrolling the page (preventDefault called)", () => {
    const { container } = render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        cellEditing={{ onCellsChange: vi.fn() }}
      />,
    );
    fireEvent.mouseDown(cellAt(container, "1", "name"));
    const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    cellAt(container, "1", "name").dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("keyboard/mouse selection wiring is inert when `cellEditing` is omitted, even with `editing` set", () => {
    const { container } = render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        editing={{ onSave: vi.fn() }}
      />,
    );
    expect(container.querySelector("[data-cell-row]")).not.toBeInTheDocument();
    expect(screen.getByTestId("datagrid").querySelector('[tabindex="0"]')).not.toBeInTheDocument();
  });
});

interface EditableRow {
  id: string;
  name: string;
  status: string;
  age: number;
}

const editableRows: EditableRow[] = [
  { id: "1", name: "Charlie", status: "pending", age: 30 },
  { id: "2", name: "Alice", status: "shipped", age: 25 },
];

const editableColumns: ColumnDef<EditableRow>[] = [
  {
    id: "name",
    type: "string",
    header: "Name",
    accessorKey: "name",
    editable: true,
    validateEdit: (value) => (typeof value === "string" && value.trim() === "" ? "Name is required" : undefined),
  },
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
  { id: "age", type: "number", header: "Age", accessorKey: "age" },
];

/** A stateful harness mirroring real usage: `onCellsChange` actually applies changes back onto `data`, exactly like `EditableGrid` does for row-batch `editing` mode in `DataGridEditing.test.tsx`. */
function CellEditingGrid({
  onCellsChange,
  columnsOverride,
}: {
  onCellsChange?: (changes: CellChange<EditableRow>[]) => void;
  columnsOverride?: ColumnDef<EditableRow>[];
}): ReactElement {
  const [data, setData] = useState(editableRows);
  return (
    <DataGrid
      columns={columnsOverride ?? editableColumns}
      dataSource={{ mode: "client", data }}
      getRowId={(row) => row.id}
      showPagination={false}
      cellEditing={{
        onCellsChange: (changes) => {
          onCellsChange?.(changes);
          setData((prev) =>
            prev.map((row) => {
              const change = changes.find((c) => c.rowId === row.id);
              return change ? { ...row, [change.columnId]: change.value } : row;
            }),
          );
        },
      }}
    />
  );
}

function editableCellAt(container: HTMLElement, rowId: string, columnId: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-cell-row="${rowId}"][data-cell-col="${columnId}"]`);
  if (!el) throw new Error(`no cell found for ${rowId}/${columnId}`);
  return el;
}

describe("DataGrid cellEditing — per-cell editing", () => {
  it("renders editable columns as static clickable text until double-clicked or selected+F2'd", () => {
    render(<CellEditingGrid />);
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charlie");
  });

  it("double-clicking an editable cell opens its editor; a non-editable cell ignores double-click", () => {
    const { container } = render(<CellEditingGrid />);
    fireEvent.doubleClick(editableCellAt(container, "1", "name"));
    expect(screen.getByTestId("edit-1-name")).toBeInTheDocument();

    fireEvent.doubleClick(editableCellAt(container, "1", "age"));
    expect(screen.queryByTestId("edit-1-age")).not.toBeInTheDocument();
  });

  it("only one cell edits at a time — double-clicking a second cell closes the first without committing it", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.doubleClick(editableCellAt(container, "1", "name"));
    const input = screen.getByTestId("edit-1-name");
    await userEvent.clear(input);
    await userEvent.type(input, "Changed");

    fireEvent.doubleClick(editableCellAt(container, "2", "name"));
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("edit-2-name")).toBeInTheDocument();
    // Never blurred/committed — the buffered draft on cell 1 is simply discarded.
    expect(onCellsChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charlie");
  });

  it("F2 on a selected editable cell opens its editor starting from the current value", () => {
    const { container } = render(<CellEditingGrid />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.keyDown(editableCellAt(container, "1", "name"), { key: "F2" });
    expect(screen.getByTestId("edit-1-name")).toHaveValue("Charlie");
  });

  it("typing a printable character on a selected editable cell opens its editor, REPLACING the current value", () => {
    const { container } = render(<CellEditingGrid />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.keyDown(editableCellAt(container, "1", "name"), { key: "X" });
    expect(screen.getByTestId("edit-1-name")).toHaveValue("X");
  });

  it("a buffered (string) editor does not call onCellsChange per keystroke — only on blur", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.doubleClick(editableCellAt(container, "1", "name"));
    const input = screen.getByTestId("edit-1-name");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed");
    expect(onCellsChange).not.toHaveBeenCalled();

    // A plain click on a non-focusable element (not Tab, which this editor's
    // own keydown handler already intercepts for its own commit-and-continue
    // path — tested separately) is what actually isolates "blur alone".
    await userEvent.click(container);
    expect(onCellsChange).toHaveBeenCalledTimes(1);
    const changes = onCellsChange.mock.calls[0]![0] as CellChange<EditableRow>[];
    expect(changes).toEqual([{ rowId: "1", row: editableRows[0], columnId: "name", previousValue: "Charlie", value: "Renamed" }]);
    // The editor closes and the local echo shows the new value immediately.
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Renamed");
  });

  it("Escape reverts a buffered edit without calling onCellsChange", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.doubleClick(editableCellAt(container, "1", "name"));
    const input = screen.getByTestId("edit-1-name");
    await userEvent.clear(input);
    await userEvent.type(input, "Whatever");
    await userEvent.keyboard("{Escape}");

    expect(onCellsChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charlie");
  });

  it("blurring away from a buffered editor with an invalid value reverts instead of committing", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.doubleClick(editableCellAt(container, "1", "name"));
    const input = screen.getByTestId("edit-1-name");
    await userEvent.clear(input);
    await userEvent.click(container);

    expect(onCellsChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charlie");
  });

  it("Enter on a buffered editor with an invalid value blocks the commit and keeps editing open", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.doubleClick(editableCellAt(container, "1", "name"));
    const input = screen.getByTestId("edit-1-name");
    await userEvent.clear(input);
    await userEvent.keyboard("{Enter}");

    expect(onCellsChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("edit-1-name")).toBeInTheDocument();
  });

  it("selecting an option in the default enum editor commits immediately — no separate blur/Enter needed", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.doubleClick(editableCellAt(container, "1", "status"));
    await userEvent.click(screen.getByTestId("edit-1-status"));
    await userEvent.click(await screen.findByRole("option", { name: "Shipped" }));

    expect(onCellsChange).toHaveBeenCalledTimes(1);
    const changes = onCellsChange.mock.calls[0]![0] as CellChange<EditableRow>[];
    expect(changes).toEqual([{ rowId: "1", row: editableRows[0], columnId: "status", previousValue: "pending", value: "shipped" }]);
    expect(screen.queryByTestId("edit-1-status")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-status")).toHaveTextContent("Shipped");
  });
});
