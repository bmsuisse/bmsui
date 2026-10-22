import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import { DataGrid } from "../../src/grid/DataGrid";
import { TreeDataGrid } from "../../src/tree/TreeDataGrid";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: "1", name: "Alpha", amount: 10 },
  { id: "2", name: "Beta", amount: 20 },
  { id: "3", name: "Gamma", amount: 30 },
];

const columns: ColumnDef<Row>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name", headerClassName: "bg-amber-50" },
  {
    id: "amount",
    type: "number",
    header: "Amount",
    accessorKey: "amount",
    cellClassName: "bg-sky-50",
    summary: (all) => all.reduce((sum, row) => sum + row.amount, 0),
  },
  {
    id: "action",
    type: "string",
    header: "Action",
    accessorKey: "name",
    cell: (_value, row) => <button type="button">Open {row.name}</button>,
  },
];

function renderFlat(props: Partial<Parameters<typeof DataGrid<Row>>[0]> = {}) {
  return render(
    <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} {...props} />,
  );
}

function renderTree(props: Partial<Parameters<typeof TreeDataGrid<Row>>[0]> = {}) {
  return render(
    <TreeDataGrid columns={columns} data={rows} getRowId={(row) => row.id} getChildren={() => undefined} {...props} />,
  );
}

const flatRow = (id: string) => screen.getByTestId(`row-${id}`);
const treeRow = (id: string) => screen.getByTestId(`tree-row-${id}`);

describe("zebra does not override a caller's row background", () => {
  it("DataGrid keeps getRowProps' bg-* on odd rows", () => {
    renderFlat({ getRowProps: () => ({ className: "bg-red-100" }) });
    expect(flatRow("2")).toHaveClass("bg-red-100");
    expect(flatRow("2")).not.toHaveClass("bg-foreground/5");
  });

  it("TreeDataGrid keeps getRowProps' bg-* on odd rows", () => {
    renderTree({ getRowProps: () => ({ className: "bg-red-100" }) });
    expect(treeRow("2")).toHaveClass("bg-red-100");
    expect(treeRow("2")).not.toHaveClass("bg-foreground/5");
  });
});

describe.each([
  ["DataGrid", renderFlat, flatRow],
  ["TreeDataGrid", renderTree, treeRow],
] as const)("%s active row", (_name, renderGrid, rowById) => {
  it("marks the active row, on odd and even rows alike", () => {
    renderGrid({ activeRowId: "2" });
    expect(rowById("2")).toHaveAttribute("aria-selected", "true");
    expect(rowById("2")).toHaveAttribute("data-active", "true");
    expect(rowById("2")).toHaveClass("bg-primary/10");
    expect(rowById("2")).not.toHaveClass("bg-foreground/5");
    expect(rowById("1")).toHaveAttribute("aria-selected", "false");
  });

  it("is untouched without the props", () => {
    renderGrid();
    expect(rowById("1")).not.toHaveAttribute("aria-selected");
    expect(rowById("1")).not.toHaveAttribute("tabIndex");
  });

  it("toggles on a row click and Enter/Space on the row, not on an inner control", async () => {
    const onActiveRowChange = vi.fn();
    renderGrid({ activeRowId: "1", onActiveRowChange });
    expect(rowById("2")).toHaveAttribute("tabIndex", "0");

    await userEvent.click(screen.getByText("Beta"));
    expect(onActiveRowChange).toHaveBeenLastCalledWith("2");
    await userEvent.click(screen.getByText("Alpha"));
    expect(onActiveRowChange).toHaveBeenLastCalledWith(null);

    onActiveRowChange.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Open Gamma" }));
    expect(onActiveRowChange).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("button", { name: "Open Gamma" }), { key: "Enter" });
    expect(onActiveRowChange).not.toHaveBeenCalled();

    fireEvent.keyDown(rowById("3"), { key: "Enter" });
    expect(onActiveRowChange).toHaveBeenLastCalledWith("3");
    fireEvent.keyDown(rowById("3"), { key: " " });
    expect(onActiveRowChange).toHaveBeenCalledTimes(2);
  });

  it("still runs the caller's own row onClick", async () => {
    const onClick = vi.fn();
    const onActiveRowChange = vi.fn();
    renderGrid({ onActiveRowChange, getRowProps: () => ({ onClick }) });
    await userEvent.click(screen.getByText("Beta"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onActiveRowChange).toHaveBeenCalledWith("2");
  });

  it("applies cellClassName to body and totals cells, headerClassName to the header", () => {
    renderGrid({ showTotals: true });
    expect(screen.getByText("20").closest("td")).toHaveClass("bg-sky-50");
    expect(screen.getByText("60").closest("td")).toHaveClass("bg-sky-50");
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveClass("bg-amber-50");
  });
});

describe("TreeDataGrid maxBodyHeight", () => {
  it("accepts a CSS length", () => {
    renderTree({ maxBodyHeight: "100%", testId: "tree-scroll" });
    expect(screen.getByTestId("tree-scroll")).toHaveStyle({ maxHeight: "100%" });
  });
});
