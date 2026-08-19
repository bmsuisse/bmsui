import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import type { MenuItem } from "../../src/menu/types";
import { TreeDataGrid } from "../../src/tree/TreeDataGrid";

interface Node {
  id: string;
  name: string;
  children?: Node[];
  lazy?: boolean;
}

const columns: ColumnDef<Node>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
];

const eagerTree: Node[] = [
  {
    id: "a",
    name: "Alpha",
    children: [
      { id: "a1", name: "Alpha One" },
      { id: "a2", name: "Alpha Two" },
    ],
  },
  { id: "b", name: "Beta" },
];

function dataRows(): HTMLElement[] {
  return screen.getAllByRole("row").slice(1); // drop header row
}

describe("TreeDataGrid", () => {
  it("renders only root rows, collapsed, on first render", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
      />,
    );
    expect(dataRows()).toHaveLength(2);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
  });

  it("expands a node with eager children on click, indenting them one level deeper", async () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        indentSize={20}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByText("Alpha One")).toBeInTheDocument();
    expect(screen.getByText("Alpha Two")).toBeInTheDocument();
    expect(dataRows()).toHaveLength(4);
  });

  it("does not show an expand chevron for a leaf row", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
      />,
    );
    const betaRow = screen.getByText("Beta").closest("tr")!;
    expect(within(betaRow).queryByRole("button")).not.toBeInTheDocument();
  });

  it("lazily loads children on expand, showing a loading state, then caching the result", async () => {
    const lazyNode: Node = { id: "c", name: "Gamma", lazy: true };
    let resolveLoad!: (value: Node[]) => void;
    const onLoadChildren = vi.fn(
      () =>
        new Promise<Node[]>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    render(
      <TreeDataGrid
        columns={columns}
        data={[lazyNode]}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        hasChildren={(row) => Boolean(row.lazy)}
        onLoadChildren={onLoadChildren}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(onLoadChildren).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Collapse" })).toBeDisabled();

    resolveLoad([{ id: "c1", name: "Gamma One" }]);
    await waitFor(() => expect(screen.getByText("Gamma One")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Collapse" })).not.toBeDisabled();

    // Collapse and re-expand: no second fetch.
    await userEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(screen.queryByText("Gamma One")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByText("Gamma One")).toBeInTheDocument();
    expect(onLoadChildren).toHaveBeenCalledOnce();
  });

  it("shows an inline error with a working retry affordance when loading children fails", async () => {
    const lazyNode: Node = { id: "d", name: "Delta", lazy: true };
    const onLoadChildren = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([{ id: "d1", name: "Delta One" }]);

    render(
      <TreeDataGrid
        columns={columns}
        data={[lazyNode]}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        hasChildren={(row) => Boolean(row.lazy)}
        onLoadChildren={onLoadChildren}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(await screen.findByText("Failed to load.")).toBeInTheDocument();
    expect(screen.queryByText("Delta One")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Delta One")).toBeInTheDocument());
    expect(screen.queryByText("Failed to load.")).not.toBeInTheDocument();
  });

  it("decorates the column matching treeColumnId, not necessarily the first column", async () => {
    const twoColumns: ColumnDef<Node>[] = [
      { id: "id", type: "string", header: "ID", accessorKey: "id" },
      { id: "name", type: "string", header: "Name", accessorKey: "name" },
    ];
    render(
      <TreeDataGrid
        columns={twoColumns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        treeColumnId="name"
      />,
    );
    const alphaRow = screen.getByText("Alpha").closest("tr")!;
    expect(within(alphaRow).getByRole("button", { name: "Expand" })).toBeInTheDocument();
  });

  it("auto-expands via initialExpandedLevel", async () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        initialExpandedLevel={1}
      />,
    );
    expect(await screen.findByText("Alpha One")).toBeInTheDocument();
  });

  it("applies getRowProps per row, based on the node and its depth, merged with automatic zebra striping", async () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        getRowProps={(_row, depth) => (depth > 0 ? { className: "font-semibold" } : {})}
      />,
    );
    expect(screen.getByText("Alpha").closest("tr")).not.toHaveClass("font-semibold");
    expect(screen.getByText("Beta").closest("tr")).toHaveClass("bg-foreground/5");
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    const alphaOneRow = screen.getByText("Alpha One").closest("tr")!;
    expect(alphaOneRow).toHaveClass("font-semibold");
    expect(alphaOneRow).toHaveClass("bg-foreground/5");
  });

  it("fires getRowProps' onClick when the row is clicked", async () => {
    const onRowClick = vi.fn();
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        getRowProps={(row) => ({ onClick: () => onRowClick(row.id) })}
      />,
    );
    await userEvent.click(screen.getByText("Beta"));
    expect(onRowClick).toHaveBeenCalledWith("b");
  });

  it("does not fire a row-wide onClick from getRowProps when the expand chevron is clicked instead", async () => {
    const onRowClick = vi.fn();
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        getRowProps={(row) => ({ onClick: () => onRowClick(row.id) })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("does not fire a row-wide onClick from getRowProps when the rowActions kebab trigger is clicked instead", async () => {
    const onRowClick = vi.fn();
    const rowActions: MenuItem<Node>[] = [{ id: "edit", label: "Edit", onSelect: () => {} }];
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        getRowProps={(row) => ({ onClick: () => onRowClick(row.id) })}
        rowActions={rowActions}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Row actions for b" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("renders a per-row actions menu when rowActions is given", async () => {
    const onSelect = vi.fn();
    const rowActions: MenuItem<Node>[] = [{ id: "edit", label: "Edit", onSelect }];
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        rowActions={rowActions}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Row actions for b" }));
    await userEvent.click(await screen.findByText("Edit"));
    expect(onSelect).toHaveBeenCalledWith({ row: eagerTree[1] });
  });

  it("shows a 'No results.' row for an empty tree", () => {
    render(
      <TreeDataGrid columns={columns} data={[]} getRowId={(row) => row.id} getChildren={(row) => row.children} />,
    );
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("virtualizes large trees: not every root row is in the DOM at once", () => {
    const originalRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      return { ...originalRect.call(this), height: 400, width: 600 } as DOMRect;
    };

    const bigTree: Node[] = Array.from({ length: 300 }, (_, i) => ({ id: `n${i}`, name: `Node ${i}` }));
    render(
      <TreeDataGrid
        columns={columns}
        data={bigTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        virtualizeThreshold={50}
      />,
    );

    expect(dataRows().length).toBeLessThan(300);

    Element.prototype.getBoundingClientRect = originalRect;
  });

  it("renders every row directly (no windowing) below the virtualize threshold", () => {
    const mediumTree: Node[] = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, name: `Node ${i}` }));
    render(
      <TreeDataGrid
        columns={columns}
        data={mediumTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        virtualizeThreshold={100}
      />,
    );
    expect(dataRows()).toHaveLength(30);
  });
});

describe("TreeDataGrid (selection)", () => {
  it("renders no selection column when selectedIds/onSelectedIdsChange are omitted", () => {
    render(
      <TreeDataGrid columns={columns} data={eagerTree} getRowId={(row) => row.id} getChildren={(row) => row.children} />,
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("toggles only the clicked row's own id, never its children or parent", async () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        selectedIds={new Set()}
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Select row b" }));
    expect(onSelectedIdsChange).toHaveBeenCalledWith(new Set(["b"]));
  });

  it("shows a parent as indeterminate when only some of its loaded (expanded) children are selected", async () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        selectedIds={new Set(["a1"])}
        onSelectedIdsChange={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByRole("checkbox", { name: "Select row a" })).toHaveAttribute("data-state", "indeterminate");
    expect(screen.getByRole("checkbox", { name: "Select row a1" })).toBeChecked();
  });

  it("shows an ancestor as unchecked, not indeterminate, when a selected descendant sits behind a lazy node that's never been expanded/fetched", () => {
    // "c" has children server-side (hasChildren says so) but none loaded yet —
    // getChildren returns undefined and childrenMap has no entry for it, since
    // it's never been expanded. A hypothetically-selected descendant id is
    // simply invisible to the walk until that fetch happens.
    const lazyNode: Node = { id: "c", name: "Gamma", lazy: true };
    render(
      <TreeDataGrid
        columns={columns}
        data={[lazyNode]}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        hasChildren={(row) => Boolean(row.lazy)}
        onLoadChildren={() => new Promise<Node[]>(() => {})}
        selectedIds={new Set(["c-hidden-child"])}
        onSelectedIdsChange={() => {}}
      />,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Select row c" });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).not.toHaveAttribute("data-state", "indeterminate");
  });

  it("getRowSelectionState fully overrides a row's checked/indeterminate display", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        selectedIds={new Set()}
        onSelectedIdsChange={() => {}}
        getRowSelectionState={(row) => (row.id === "b" ? { checked: true } : undefined)}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Select row b" })).toBeChecked();
  });

  it("isRowSelectionDisabled disables just that row's checkbox", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        selectedIds={new Set()}
        onSelectedIdsChange={() => {}}
        isRowSelectionDisabled={(row) => row.id === "b"}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Select row b" })).toBeDisabled();
  });

  it("does not fire a row-wide onClick from getRowProps when the selection checkbox is clicked", async () => {
    const onRowClick = vi.fn();
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        getRowProps={(row) => ({ onClick: () => onRowClick(row.id) })}
        selectedIds={new Set()}
        onSelectedIdsChange={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Select row b" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
