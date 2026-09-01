import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CellChange, ColumnDef, StringColumn } from "../../src";
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
  alwaysEdit,
  disabled,
}: {
  onCellsChange?: (changes: CellChange<EditableRow>[]) => void;
  columnsOverride?: ColumnDef<EditableRow>[];
  alwaysEdit?: boolean;
  disabled?: boolean;
}): ReactElement {
  const [data, setData] = useState(editableRows);
  return (
    <DataGrid
      columns={columnsOverride ?? editableColumns}
      dataSource={{ mode: "client", data }}
      getRowId={(row) => row.id}
      showPagination={false}
      cellEditing={{
        alwaysEdit,
        disabled,
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
  it("renders editable columns as static text until clicked/double-clicked/selected+F2'd", () => {
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

/** A minimal `DataTransfer`-shaped mock — enough for `event.clipboardData.setData`/`getData` to work in jsdom, which doesn't implement a real `DataTransfer`. */
function mockClipboardData(initialText = ""): { setData: ReturnType<typeof vi.fn>; getData: () => string } {
  let text = initialText;
  return {
    setData: vi.fn((type: string, value: string) => {
      if (type === "text/plain") text = value;
    }),
    getData: () => text,
  };
}

describe("DataGrid cellEditing — clipboard", () => {
  it("copying a range sets Excel-compatible TSV onto the clipboard", async () => {
    const { container } = render(<CellEditingGrid />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.mouseMove(editableCellAt(container, "2", "status"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.mouseUp(window);

    const clipboardData = mockClipboardData();
    // Copy/paste bubble up from wherever they're dispatched to <DataGrid>'s
    // scroll-container listener — any cell (a real descendant of it) works;
    // it doesn't need to be one of the currently-selected ones.
    fireEvent.copy(editableCellAt(container, "1", "name"), { clipboardData });
    expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "Charlie\tPending\nAlice\tShipped");
  });

  it("pasting a single value fills every cell of a multi-cell selection", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.mouseMove(editableCellAt(container, "2", "name"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.mouseUp(window);

    fireEvent.paste(editableCellAt(container, "1", "name"), { clipboardData: mockClipboardData("Bob") });
    expect(onCellsChange).toHaveBeenCalledTimes(1);
    const changes = onCellsChange.mock.calls[0]![0] as CellChange<EditableRow>[];
    expect(changes).toEqual([
      { rowId: "1", row: editableRows[0], columnId: "name", previousValue: "Charlie", value: "Bob" },
      { rowId: "2", row: editableRows[1], columnId: "name", previousValue: "Alice", value: "Bob" },
    ]);
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Bob");
    expect(screen.getByTestId("cell-2-name")).toHaveTextContent("Bob");
  });

  it("pasting a multi-cell block anchors at the selection's top-left and extends to match its shape", () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    // `shiftKey: true` selects without opening the cell's editor (a plain
    // click would, since a single-cell click now opens it) — see the
    // "shows no fill handle..." test below for the same convention.
    fireEvent.mouseDown(editableCellAt(container, "1", "name"), { shiftKey: true });
    fireEvent.mouseUp(window);

    fireEvent.paste(editableCellAt(container, "1", "name"), { clipboardData: mockClipboardData("Bob\tShipped\nDana\tPending") });
    expect(onCellsChange).toHaveBeenCalledTimes(1);
    const changes = onCellsChange.mock.calls[0]![0] as CellChange<EditableRow>[];
    expect(changes).toEqual([
      { rowId: "1", row: editableRows[0], columnId: "name", previousValue: "Charlie", value: "Bob" },
      { rowId: "1", row: editableRows[0], columnId: "status", previousValue: "pending", value: "shipped" },
      { rowId: "2", row: editableRows[1], columnId: "name", previousValue: "Alice", value: "Dana" },
      { rowId: "2", row: editableRows[1], columnId: "status", previousValue: "shipped", value: "pending" },
    ]);
  });

  it("skips a cell whose pasted text doesn't coerce to that column's type, committing the rest of the batch", () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"), { shiftKey: true });
    fireEvent.mouseUp(window);

    // "not-a-status" doesn't match any enum option's value or label.
    fireEvent.paste(editableCellAt(container, "1", "name"), { clipboardData: mockClipboardData("Bob\tnot-a-status") });
    expect(onCellsChange).toHaveBeenCalledTimes(1);
    const changes = onCellsChange.mock.calls[0]![0] as CellChange<EditableRow>[];
    expect(changes).toEqual([{ rowId: "1", row: editableRows[0], columnId: "name", previousValue: "Charlie", value: "Bob" }]);
    expect(screen.getByTestId("cell-1-status")).toHaveTextContent("Pending"); // untouched
  });

  it("does nothing on paste when no cell is selected", () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.paste(editableCellAt(container, "1", "name"), { clipboardData: mockClipboardData("Bob") });
    expect(onCellsChange).not.toHaveBeenCalled();
  });

  it("copy/paste don't throw when `cellEditing` is omitted (no listeners attached, no data-cell nodes to target)", () => {
    const { container } = render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    const grid = screen.getByTestId("datagrid");
    expect(container.querySelector("[data-cell-row]")).not.toBeInTheDocument();
    expect(() => fireEvent.copy(grid, { clipboardData: mockClipboardData() })).not.toThrow();
    expect(() => fireEvent.paste(grid, { clipboardData: mockClipboardData("X") })).not.toThrow();
  });

  it("a paste while a cell is actively being edited is left to the native input (no range-paste)", () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.doubleClick(editableCellAt(container, "1", "name"));
    const input = screen.getByTestId("edit-1-name");
    fireEvent.paste(input, { clipboardData: mockClipboardData("Bob") });
    // Not our range-paste logic — no gesture-level onCellsChange call.
    expect(onCellsChange).not.toHaveBeenCalled();
  });
});

describe("DataGrid cellEditing — fill handle", () => {
  it("shows no fill handle before any cell is selected, and one after", () => {
    const { container } = render(<CellEditingGrid />);
    expect(screen.queryByTestId("cell-fill-handle")).not.toBeInTheDocument();
    // `shiftKey: true` selects without opening the cell's editor (a plain
    // click would, since a single-cell click now opens it directly) — the
    // fill handle only shows for a selected-but-not-editing cell.
    fireEvent.mouseDown(editableCellAt(container, "1", "name"), { shiftKey: true });
    fireEvent.mouseUp(window);
    expect(screen.getByTestId("cell-fill-handle")).toBeInTheDocument();
  });

  it("dragging the fill handle down copies the source cell's value into the newly-covered cells", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"), { shiftKey: true });
    fireEvent.mouseUp(window);

    fireEvent.mouseDown(screen.getByTestId("cell-fill-handle"));
    fireEvent.mouseMove(editableCellAt(container, "2", "name"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.mouseUp(window);

    expect(onCellsChange).toHaveBeenCalledTimes(1);
    const changes = onCellsChange.mock.calls[0]![0] as CellChange<EditableRow>[];
    expect(changes).toEqual([{ rowId: "2", row: editableRows[1], columnId: "name", previousValue: "Alice", value: "Charlie" }]);
    expect(screen.getByTestId("cell-2-name")).toHaveTextContent("Charlie");
    // The source cell itself is untouched.
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Charlie");
  });

  it("mousedown on the fill handle does not also start (or extend) a normal range-select drag on the cell underneath it", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"), { shiftKey: true });
    fireEvent.mouseUp(window);

    fireEvent.mouseDown(screen.getByTestId("cell-fill-handle"));
    fireEvent.mouseMove(editableCellAt(container, "2", "name"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.mouseUp(window);

    // A fill-drag calls onCellsChange (proven above); a plain range-select
    // drag never does on its own — this is the fill path, not the other one.
    expect(onCellsChange).toHaveBeenCalledTimes(1);
  });

  it("a fill-drag that never moves (mousedown then immediate mouseup) commits nothing", () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"), { shiftKey: true });
    fireEvent.mouseUp(window);
    fireEvent.mouseDown(screen.getByTestId("cell-fill-handle"));
    fireEvent.mouseUp(window);
    expect(onCellsChange).not.toHaveBeenCalled();
  });
});

describe("DataGrid cellEditing — multiline editor", () => {
  const multilineColumns: ColumnDef<EditableRow>[] = [
    { ...(editableColumns[0]! as StringColumn<EditableRow>), multiline: true },
    ...editableColumns.slice(1),
  ];

  it("plain Enter commits and moves on, same as a single-line buffered editor", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} columnsOverride={multilineColumns} />);
    fireEvent.doubleClick(editableCellAt(container, "1", "name"));
    const textarea = screen.getByTestId("edit-1-name");
    expect(textarea.tagName).toBe("TEXTAREA");
    // A single `fireEvent.change` (not character-by-character `userEvent.type`)
    // — this exercises the same commit logic without depending on jsdom's
    // multi-keystroke controlled-textarea simulation, which has its own
    // real-browser-vs-jsdom fidelity gaps that the e2e suite (real browser,
    // real focus/selection timing) is the right place to validate instead.
    fireEvent.change(textarea, { target: { value: "Renamed" } });
    await userEvent.keyboard("{Enter}");

    expect(onCellsChange).toHaveBeenCalledTimes(1);
    const changes = onCellsChange.mock.calls[0]![0] as CellChange<EditableRow>[];
    expect(changes).toEqual([{ rowId: "1", row: editableRows[0], columnId: "name", previousValue: "Charlie", value: "Renamed" }]);
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
  });

  it("Shift+Enter inserts a literal newline instead of committing, leaving the editor open", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} columnsOverride={multilineColumns} />);
    fireEvent.doubleClick(editableCellAt(container, "1", "name"));
    const textarea = screen.getByTestId("edit-1-name");
    fireEvent.change(textarea, { target: { value: "Line one\nLine two" } });
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onCellsChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("edit-1-name")).toBeInTheDocument();
  });
});

describe("DataGrid cellEditing — click-to-edit", () => {
  it("a plain click on an editable cell opens its editor directly — no double-click needed", () => {
    const { container } = render(<CellEditingGrid />);
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.mouseUp(window);
    expect(screen.getByTestId("edit-1-name")).toHaveValue("Charlie");
  });

  it("a plain click on a non-editable cell just selects it — no editor opens", () => {
    const { container } = render(<CellEditingGrid />);
    fireEvent.mouseDown(editableCellAt(container, "1", "age"));
    fireEvent.mouseUp(window);
    expect(screen.queryByTestId("edit-1-age")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-selection-overlay")).toBeInTheDocument();
  });

  it("shift+click selects without opening the editor", () => {
    const { container } = render(<CellEditingGrid />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"), { shiftKey: true });
    fireEvent.mouseUp(window);
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-selection-overlay")).toBeInTheDocument();
  });

  it("a real drag — even one that ends back on the anchor cell — does not open an editor", async () => {
    const { container } = render(<CellEditingGrid />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.mouseMove(editableCellAt(container, "2", "name"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.mouseMove(editableCellAt(container, "1", "name"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.mouseUp(window);
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
  });

  it("clicking again inside an already-open editor's input does not reset its in-progress draft", async () => {
    const { container } = render(<CellEditingGrid />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.mouseUp(window);
    const input = screen.getByTestId("edit-1-name");
    await userEvent.type(input, "X");
    expect(input).toHaveValue("CharlieX");

    // Reposition the cursor within the same, still-open editor — this must
    // not be treated as "a plain click opened this cell," which would reset
    // the draft back to the pre-edit value.
    fireEvent.mouseDown(input);
    fireEvent.mouseUp(window);
    expect(screen.getByTestId("edit-1-name")).toHaveValue("CharlieX");
  });

  it("clicking a different editable cell while one is being edited commits/closes the old one and opens the new one directly", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid onCellsChange={onCellsChange} />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.mouseUp(window);
    await userEvent.clear(screen.getByTestId("edit-1-name"));
    await userEvent.type(screen.getByTestId("edit-1-name"), "Renamed");

    fireEvent.mouseDown(editableCellAt(container, "2", "name"));
    fireEvent.mouseUp(window);

    expect(onCellsChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("edit-1-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-name")).toHaveTextContent("Renamed");
    expect(screen.getByTestId("edit-2-name")).toHaveValue("Alice");
  });
});

describe("DataGrid cellEditing — alwaysEdit", () => {
  it("renders every editable cell's editor immediately, with no click at all", () => {
    render(<CellEditingGrid alwaysEdit />);
    expect(screen.getByTestId("edit-1-name")).toHaveValue("Charlie");
    expect(screen.getByTestId("edit-2-name")).toHaveValue("Alice");
    expect(screen.getByTestId("edit-1-status")).toBeInTheDocument();
  });

  it("a non-editable column still renders as static text", () => {
    render(<CellEditingGrid alwaysEdit />);
    expect(screen.queryByTestId("edit-1-age")).not.toBeInTheDocument();
    expect(screen.getByTestId("cell-1-age")).toHaveTextContent("30");
  });

  it("a buffered editor still only commits on blur/Enter, not per keystroke", async () => {
    const onCellsChange = vi.fn();
    render(<CellEditingGrid alwaysEdit onCellsChange={onCellsChange} />);
    const input = screen.getByTestId("edit-1-name");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed");
    expect(onCellsChange).not.toHaveBeenCalled();

    await userEvent.keyboard("{Enter}");
    expect(onCellsChange).toHaveBeenCalledTimes(1);
    const changes = onCellsChange.mock.calls[0]![0] as CellChange<EditableRow>[];
    expect(changes).toEqual([{ rowId: "1", row: editableRows[0], columnId: "name", previousValue: "Charlie", value: "Renamed" }]);
    // Still open afterward — every editable cell always has its editor.
    expect(screen.getByTestId("edit-1-name")).toHaveValue("Renamed");
  });

  it("each editable cell keeps its own independent, uncommitted draft", async () => {
    render(<CellEditingGrid alwaysEdit />);
    await userEvent.type(screen.getByTestId("edit-1-name"), "X");
    await userEvent.type(screen.getByTestId("edit-2-name"), "Y");
    expect(screen.getByTestId("edit-1-name")).toHaveValue("CharlieX");
    expect(screen.getByTestId("edit-2-name")).toHaveValue("AliceY");
  });

  it("an atomic (enum) editor still commits immediately on selection", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid alwaysEdit onCellsChange={onCellsChange} />);
    // A built-in enum widget's own open-on-click is deliberately deferred to
    // this exact mousedown/mouseup(window) pair under `alwaysEdit` (see
    // `AtomicGestureContext`'s own doc) — same convention the plain-click/
    // shift-click tests above already use for the identical reason
    // (`userEvent.click` alone doesn't reliably let the window `mouseup`
    // listener attach in time under jsdom).
    fireEvent.mouseDown(editableCellAt(container, "1", "status"));
    fireEvent.mouseUp(window);
    await userEvent.click(await screen.findByRole("option", { name: "Shipped" }));

    expect(onCellsChange).toHaveBeenCalledTimes(1);
    const changes = onCellsChange.mock.calls[0]![0] as CellChange<EditableRow>[];
    expect(changes).toEqual([{ rowId: "1", row: editableRows[0], columnId: "status", previousValue: "pending", value: "shipped" }]);
  });

  it("a range copy still works when the selection was made by mouse, not by focusing an input", async () => {
    const { container } = render(<CellEditingGrid alwaysEdit />);
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.mouseMove(editableCellAt(container, "2", "status"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.mouseUp(window);

    const clipboardData = mockClipboardData();
    fireEvent.copy(editableCellAt(container, "1", "name"), { clipboardData });
    expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "Charlie\tPending\nAlice\tShipped");
  });

  it("a paste targeting a focused text input is left to the browser, not treated as a range-paste", () => {
    const onCellsChange = vi.fn();
    render(<CellEditingGrid alwaysEdit onCellsChange={onCellsChange} />);
    const input = screen.getByTestId("edit-1-name");
    fireEvent.paste(input, { clipboardData: mockClipboardData("Bob") });
    expect(onCellsChange).not.toHaveBeenCalled();
  });

  it("cellEditing.disabled disables every editable cell's input, not just the eventual commit", async () => {
    const onCellsChange = vi.fn();
    render(<CellEditingGrid alwaysEdit disabled onCellsChange={onCellsChange} />);
    const input = screen.getByTestId("edit-1-name");
    expect(input).toBeDisabled();
    // `userEvent.type` itself refuses to type into a disabled control — the
    // real assertion is that it's disabled at all, this just confirms it
    // has teeth (a merely-visual disable wouldn't stop this).
    await userEvent.type(input, "X");
    expect(input).toHaveValue("Charlie");
    expect(onCellsChange).not.toHaveBeenCalled();
  });

  it("a fill-drag landing on a cell with an uncommitted draft shows the new value, not the stale draft", async () => {
    const onCellsChange = vi.fn();
    const { container } = render(<CellEditingGrid alwaysEdit onCellsChange={onCellsChange} />);
    // Start (but don't commit) an edit on row 2's name cell.
    await userEvent.type(screen.getByTestId("edit-2-name"), "Z");
    expect(screen.getByTestId("edit-2-name")).toHaveValue("AliceZ");

    // Select row 1's name cell, then fill-drag it down onto row 2.
    fireEvent.mouseDown(editableCellAt(container, "1", "name"));
    fireEvent.mouseUp(window);
    fireEvent.mouseDown(screen.getByTestId("cell-fill-handle"));
    fireEvent.mouseMove(editableCellAt(container, "2", "name"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.mouseUp(window);

    expect(onCellsChange).toHaveBeenCalledTimes(1);
    // The fill's own committed value must win over the now-stale draft —
    // not "AliceZ", which would silently discard what the fill just applied
    // the moment this cell were later blurred/committed.
    expect(screen.getByTestId("edit-2-name")).toHaveValue("Charlie");
  });
});
