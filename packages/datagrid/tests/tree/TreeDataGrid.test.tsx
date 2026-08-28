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
  tier?: string;
}

const columns: ColumnDef<Node>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
];

const twoColumns: ColumnDef<Node>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
  { id: "id", type: "string", header: "ID", accessorKey: "id" },
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

  it("omits zebra striping when zebra is false", async () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        zebra={false}
      />,
    );
    expect(screen.getByText("Beta").closest("tr")).not.toHaveClass("bg-foreground/5");
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

  it("tags every row with a data-index matching its position in flatRows", () => {
    // `@tanstack/react-virtual`'s `measureElement` (wired up via each row's
    // `ref` when virtualizing) reads this attribute straight off the DOM
    // node to know which row it just measured (see virtual-core's
    // `indexFromElement`). Without it, every row resolves to index -1 and
    // `resizeItem` discards the measurement outright (`index < 0` bails
    // before recording anything), so a row that grows past
    // `estimatedRowHeight` (e.g. an inline editor expanding within a cell)
    // never gets its real height applied -- the virtualizer's positions
    // silently drift from the actual DOM layout, which can push a
    // still-relevant row out of the computed visible range and unmount it.
    // Exercised below the virtualization threshold (jsdom never gives the
    // scroll container a real layout, so the virtualized path renders no
    // rows at all here regardless of this attribute) -- `renderRow` sets
    // `data-index` unconditionally on both paths, so this still covers the
    // regression.
    const tree: Node[] = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, name: `Node ${i}` }));
    render(
      <TreeDataGrid columns={columns} data={tree} getRowId={(row) => row.id} getChildren={(row) => row.children} />,
    );

    const rows = dataRows();
    expect(rows).toHaveLength(10);
    rows.forEach((row, i) => {
      expect(row.getAttribute("data-index")).toBe(String(i));
    });
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

describe("TreeDataGrid (columnVisibility)", () => {
  it("renders every column when columnVisibility is omitted", () => {
    render(
      <TreeDataGrid
        columns={twoColumns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ID" })).toBeInTheDocument();
  });

  it("hides a column whose id is set to false in columnVisibility", () => {
    render(
      <TreeDataGrid
        columns={twoColumns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        columnVisibility={{ id: false }}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "ID" })).not.toBeInTheDocument();
    expect(screen.queryByText("a1")).not.toBeInTheDocument();
  });

  it("keeps the tree column's indentation/chevron working when a different column is hidden", async () => {
    render(
      <TreeDataGrid
        columns={twoColumns}
        data={eagerTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        columnVisibility={{ id: false }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByText("Alpha One")).toBeInTheDocument();
  });

  it("accounts for hidden columns in the 'No results' colSpan", () => {
    render(
      <TreeDataGrid
        columns={twoColumns}
        data={[]}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        columnVisibility={{ id: false }}
      />,
    );
    const cell = screen.getByText("No results.");
    expect(cell).toHaveAttribute("colspan", "1");
  });
});

describe("TreeDataGrid (groupBy)", () => {
  const groupedTree: Node[] = [
    {
      id: "a",
      name: "Alpha",
      tier: "Senior",
      children: [{ id: "a1", name: "Alpha One" }],
    },
    { id: "b", name: "Beta", tier: "Junior" },
    { id: "c", name: "Charlie", tier: "Senior" },
  ];
  const groupByTier = (row: Node): string => row.tier ?? "Other";

  function treeRowNamesInOrder(): string[] {
    return screen.getAllByTestId(/^tree-row-/).map((row) => row.textContent ?? "");
  }

  it("buckets root rows in first-seen order, with a default 'key (count)' header label, expanded by default", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={groupedTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={groupByTier}
      />,
    );
    // Alpha is the first root, so "Senior" is the first-seen bucket, even
    // though "Junior" (Beta) sorts earlier alphabetically.
    expect(screen.getByText("Senior (2)")).toBeInTheDocument();
    expect(screen.getByText("Junior (1)")).toBeInTheDocument();
    expect(treeRowNamesInOrder()).toEqual(["Alpha", "Charlie", "Beta"]);
  });

  it("supports a renderGroupHeader override", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={groupedTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={groupByTier}
        renderGroupHeader={(key, roots) => `${key} tier — ${roots.length} people`}
      />,
    );
    expect(screen.getByText("Senior tier — 2 people")).toBeInTheDocument();
  });

  it("collapsing one group hides only its own rows", async () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={groupedTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={groupByTier}
      />,
    );
    await userEvent.click(screen.getByText("Senior (2)"));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("gives each rendered row a running data-index across groups, not reset per bucket", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={groupedTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={groupByTier}
      />,
    );
    // Senior bucket: Alpha (0), Charlie (1); Junior bucket: Beta (2) --
    // continuing, not resetting to 0, since Beta is the 3rd currently-visible row overall.
    const rows = screen.getAllByTestId(/^tree-row-/);
    expect(rows.map((row) => row.getAttribute("data-index"))).toEqual(["0", "1", "2"]);
  });

  it("excludes a collapsed group's rows from 'select all visible rows'", async () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <TreeDataGrid
        columns={columns}
        data={groupedTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={groupByTier}
        expandedGroups={{ Senior: false, Junior: true }}
        onExpandedGroupsChange={() => {}}
        selectedIds={new Set()}
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    );
    // Senior (Alpha, Charlie) is collapsed -- only Beta (Junior) is visible.
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all visible rows" }));
    expect(onSelectedIdsChange).toHaveBeenCalledWith(new Set(["b"]));
  });

  it("supports controlled expandedGroups/onExpandedGroupsChange", async () => {
    const onExpandedGroupsChange = vi.fn();
    render(
      <TreeDataGrid
        columns={columns}
        data={groupedTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={groupByTier}
        expandedGroups={{ Senior: true, Junior: false }}
        onExpandedGroupsChange={onExpandedGroupsChange}
      />,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Senior (2)"));
    expect(onExpandedGroupsChange).toHaveBeenCalledWith({ Senior: false, Junior: false });
  });

  it("forces virtualization off when combined with groupBy, even below the row-count threshold check", () => {
    const originalRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      return { ...originalRect.call(this), height: 100, width: 600 } as DOMRect;
    };

    const manyRoots: Node[] = Array.from({ length: 300 }, (_, i) => ({ id: `n${i}`, name: `Node ${i}` }));
    render(
      <TreeDataGrid
        columns={columns}
        data={manyRoots}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={() => "All"}
        virtualizeThreshold={0}
      />,
    );
    // If virtualization silently won, the small mocked viewport height would
    // keep far fewer than 300 rows in the DOM at once.
    expect(screen.getAllByTestId(/^tree-row-/)).toHaveLength(300);

    Element.prototype.getBoundingClientRect = originalRect;
  });

  it("spans the group-header row across every column, including selection/row-actions", () => {
    const rowActions: MenuItem<Node>[] = [{ id: "edit", label: "Edit", onSelect: () => {} }];
    render(
      <TreeDataGrid
        columns={columns}
        data={groupedTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={groupByTier}
        selectedIds={new Set()}
        onSelectedIdsChange={() => {}}
        rowActions={rowActions}
      />,
    );
    // columns(1) + selection(1) + rowActions(1) = 3
    const groupHeaderCell = screen.getByText("Senior (2)").closest("td")!;
    expect(groupHeaderCell).toHaveAttribute("colspan", "3");
  });

  it("sticks the group-header row below the real header while its rows scroll past", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={groupedTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={groupByTier}
      />,
    );
    const groupHeaderCell = screen.getByText("Senior (2)").closest("td")!;
    expect(groupHeaderCell).toHaveClass("sticky", "z-20", "bg-muted");
    expect(groupHeaderCell.style.top).not.toBe("");
  });

  it("omits the group-header shading when zebra is false", () => {
    render(
      <TreeDataGrid
        columns={columns}
        data={groupedTree}
        getRowId={(row) => row.id}
        getChildren={(row) => row.children}
        groupBy={groupByTier}
        zebra={false}
      />,
    );
    const groupHeaderCell = screen.getByText("Senior (2)").closest("td")!;
    expect(groupHeaderCell).not.toHaveClass("bg-muted");
    expect(groupHeaderCell).toHaveClass("bg-background", "sticky");
  });
});
