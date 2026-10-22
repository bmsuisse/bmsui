import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import type { GridState } from "../../src/filter/types";
import { TreeDataGrid } from "../../src/tree/TreeDataGrid";

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

const tree: Node[] = [
  { id: "b", name: "Beta", children: [{ id: "b2", name: "Bolt" }, { id: "b1", name: "Anvil" }] },
  { id: "a", name: "Alpha", children: [{ id: "a1", name: "Crate" }] },
];

const columns: ColumnDef<Node>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name", sortable: true, filterable: true },
];

function names(): string[] {
  return screen.getAllByTestId(/^tree-row-/).map((row) => row.textContent ?? "");
}

function Controlled({ initial }: { initial: Pick<GridState, "filter" | "sort"> }) {
  const [state, setState] = useState(initial);
  return (
    <TreeDataGrid
      columns={columns}
      data={tree}
      getRowId={(row) => row.id}
      getChildren={(row) => row.children}
      gridState={state}
      onGridStateChange={setState}
    />
  );
}

describe("TreeDataGrid: sort + filter", () => {
  it("renders no header controls without gridState, exactly as before", () => {
    render(
      <TreeDataGrid columns={columns} data={tree} getRowId={(row) => row.id} getChildren={(row) => row.children} />,
    );
    expect(screen.queryByTestId("sort-button-name")).not.toBeInTheDocument();
    expect(screen.queryByTestId("filter-trigger-name")).not.toBeInTheDocument();
    expect(names()).toEqual(["Beta", "Alpha"]);
  });

  it("sorts siblings at every level from the header toggle", async () => {
    render(<Controlled initial={{ filter: null, sort: [] }} />);
    await userEvent.click(screen.getByTestId("sort-button-name"));
    expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "ascending");
    expect(names()).toEqual(["Alpha", "Beta"]);
    await userEvent.click(screen.getAllByRole("button", { name: "Expand" })[0]!);
    expect(names()).toEqual(["Alpha", "Crate", "Beta"]);
  });

  it("filters through the header popover, opening the ancestors of a match", async () => {
    render(<Controlled initial={{ filter: null, sort: [] }} />);
    await userEvent.click(screen.getByTestId("filter-trigger-name"));
    await userEvent.type(await screen.findByPlaceholderText("Filter name..."), "Anv");
    expect(names()).toEqual(["Beta", "Anvil"]);
  });

  it("lets the user collapse a forced-open ancestor", async () => {
    render(
      <Controlled initial={{ filter: { logic: "and", filters: [{ field: "name", operator: "eq", value: "Anvil" }] }, sort: [] }} />,
    );
    expect(names()).toEqual(["Beta", "Anvil"]);
    await userEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(names()).toEqual(["Beta"]);
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(names()).toEqual(["Beta", "Anvil"]);
  });
});
