import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "../../src";
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
