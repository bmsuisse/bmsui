import { createRef } from "react";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import { TreeDataGrid } from "../../src/tree/TreeDataGrid";
import type { TreeDataGridApi } from "../../src/tree/types";

interface Row {
  id: string;
  name: string;
  amount?: number;
  kids?: Row[];
}

const rows: Row[] = [
  { id: "a", name: "Alpha", amount: 10, kids: [{ id: "a1", name: "Alpha One", amount: 4 }] },
  { id: "b", name: "Beta", amount: 20 },
];

const flat: ColumnDef<Row>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
  { id: "amount", type: "number", header: "Amount", accessorKey: "amount", cell: (v) => `CHF ${String(v)}` },
];

const grouped: ColumnDef<Row>[] = [
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
  { id: "amount", type: "number", header: "Amount", accessorKey: "amount", headerGroup: "Sales" },
  { id: "id", type: "string", header: "Code", accessorKey: "id", headerGroup: "Sales" },
];

const base = {
  data: rows,
  getRowId: (row: Row) => row.id,
  getChildren: (row: Row) => row.kids,
};

describe("TreeDataGrid headerGroup", () => {
  it("renders a spanning group row; ungrouped columns span both header rows", () => {
    render(<TreeDataGrid columns={grouped} {...base} />);
    const groupRow = screen.getByTestId("header-group-row");
    const groupCell = within(groupRow).getByText("Sales");
    expect(groupCell).toHaveAttribute("colspan", "2");
    const nameTh = within(groupRow).getByText("Name").closest("th")!;
    expect(nameTh).toHaveAttribute("rowspan", "2");
    // Leaf row carries only the grouped columns.
    const leafRow = groupRow.nextElementSibling as HTMLElement;
    expect(within(leafRow).getByText("Amount")).toBeInTheDocument();
    expect(within(leafRow).getByText("Code")).toBeInTheDocument();
    expect(within(leafRow).queryByText("Name")).not.toBeInTheDocument();
  });

  it("keeps both header rows sticky", () => {
    render(<TreeDataGrid columns={grouped} {...base} />);
    const groupRow = screen.getByTestId("header-group-row");
    for (const th of groupRow.querySelectorAll("th")) expect(th.className).toContain("sticky");
    const leafRow = groupRow.nextElementSibling as HTMLElement;
    for (const th of leafRow.querySelectorAll("th")) expect(th.className).toContain("sticky");
  });

  it("renders no group row when no column sets headerGroup", () => {
    render(<TreeDataGrid columns={flat} {...base} />);
    expect(screen.queryByTestId("header-group-row")).not.toBeInTheDocument();
  });

  it("spans selection and row-actions header cells over both rows", () => {
    render(
      <TreeDataGrid
        columns={grouped}
        {...base}
        selectedIds={new Set()}
        onSelectedIdsChange={() => {}}
        rowActions={[{ id: "x", label: "X", onSelect: () => {} }]}
      />,
    );
    const groupRow = screen.getByTestId("header-group-row");
    const spans = [...groupRow.querySelectorAll("th")].filter((th) => th.getAttribute("rowspan") === "2");
    // selection + Name + row actions
    expect(spans).toHaveLength(3);
  });
});

describe("TreeDataGrid totals", () => {
  const totals: Row = { id: "total", name: "Total", amount: 34 };

  it("renders a bottom total row with the columns' own cell renderers", () => {
    render(<TreeDataGrid columns={flat} {...base} totals={totals} />);
    const row = screen.getByTestId("totals-row");
    expect(row.closest("tfoot")).not.toBeNull();
    expect(within(row).getByText("Total")).toBeInTheDocument();
    expect(within(row).getByText("CHF 34")).toBeInTheDocument();
  });

  it("renders a top total row inside the thead, sticky, after the header rows", () => {
    render(<TreeDataGrid columns={flat} {...base} totals={totals} totalsPosition="top" />);
    const row = screen.getByTestId("totals-row");
    expect(row.closest("thead")).not.toBeNull();
    expect(row.closest("table")!.querySelector("tfoot")).toBeNull();
    for (const td of row.querySelectorAll("td")) expect(td.className).toContain("sticky");
    expect(row.previousElementSibling!.querySelector("th")).not.toBeNull();
    expect(within(row).getByText("CHF 34")).toBeInTheDocument();
  });

  it("renders the top total below both header rows when headerGroup is used", () => {
    render(<TreeDataGrid columns={grouped} {...base} totals={{ id: "t", name: "Total", amount: 1 }} totalsPosition="top" />);
    const rowsInHead = [...screen.getByTestId("totals-row").closest("thead")!.querySelectorAll("tr")];
    expect(rowsInHead.map((r) => r.getAttribute("data-testid"))).toEqual(["header-group-row", null, "totals-row"]);
  });

  it("puts totalsRowProps on the total row (test id, class, data attributes)", () => {
    render(
      <TreeDataGrid
        columns={flat}
        {...base}
        totals={totals}
        totalsRowProps={{ "data-testid": "grand-total", className: "my-total", "data-kind": "grand" }}
      />,
    );
    const row = screen.getByTestId("grand-total");
    expect(row).toHaveClass("my-total");
    expect(row).toHaveAttribute("data-kind", "grand");
    expect(screen.queryByTestId("totals-row")).not.toBeInTheDocument();
  });

  it("keeps showTotals/summary behaviour when totals is not given", () => {
    const withSummary: ColumnDef<Row>[] = [
      flat[0]!,
      { ...flat[1]!, summary: (rs) => `sum ${rs.reduce((s, r) => s + (r.amount ?? 0), 0)}` },
    ];
    render(<TreeDataGrid columns={withSummary} {...base} showTotals />);
    expect(within(screen.getByTestId("totals-row")).getByText("sum 30")).toBeInTheDocument();
  });

  it("renders nothing extra without totals", () => {
    render(<TreeDataGrid columns={flat} {...base} />);
    expect(screen.queryByTestId("totals-row")).not.toBeInTheDocument();
  });
});

describe("TreeDataGrid getRowProps state", () => {
  it("passes { expanded, hasChildren } as the 4th argument", () => {
    const getRowProps = vi.fn((_row: Row, _depth: number, _index: number, state: { expanded: boolean; hasChildren: boolean }) =>
      state.hasChildren ? { "aria-expanded": state.expanded } : {},
    );
    render(<TreeDataGrid columns={flat} {...base} getRowProps={getRowProps} initialExpandedLevel={0} />);
    expect(screen.getByTestId("tree-row-a")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("tree-row-b")).not.toHaveAttribute("aria-expanded");
    expect(getRowProps).toHaveBeenCalledWith(rows[0], 0, 0, { expanded: false, hasChildren: true });
    expect(getRowProps).toHaveBeenCalledWith(rows[1], 0, 1, { expanded: false, hasChildren: false });
  });
});

describe("TreeDataGrid tableProps", () => {
  it("spreads props on the <table> and merges className", () => {
    render(
      <TreeDataGrid
        columns={flat}
        {...base}
        tableProps={{ "aria-rowcount": 3, "data-layout": "matrix", className: "extra" }}
      />,
    );
    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("aria-rowcount", "3");
    expect(table).toHaveAttribute("data-layout", "matrix");
    expect(table).toHaveClass("extra");
    expect(table).toHaveClass("border-collapse");
  });
});

describe("TreeDataGrid apiRef", () => {
  const originalRect = Element.prototype.getBoundingClientRect;
  const originalScrollTo = Element.prototype.scrollTo;
  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalRect;
    Element.prototype.scrollTo = originalScrollTo;
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
  });

  it("scrollToIndex scrolls a virtualized, undrawn row into view", () => {
    Element.prototype.getBoundingClientRect = function (this: Element) {
      return { ...originalRect.call(this), height: 400, width: 600 } as DOMRect;
    };
    // jsdom has no layout: the virtualizer clamps to scrollHeight - clientHeight (both 0 there).
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, value: 80_000 });
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    const big: Row[] = Array.from({ length: 2000 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}` }));
    const apiRef = createRef<TreeDataGridApi>();
    render(<TreeDataGrid columns={flat} {...base} data={big} virtualizeThreshold={50} apiRef={apiRef} testId="sc" />);
    expect(screen.queryByTestId("tree-row-r1500")).not.toBeInTheDocument();
    apiRef.current!.scrollToIndex(1500);
    expect(scrollTo).toHaveBeenCalled();
    const top = (scrollTo.mock.calls.at(-1)![0] as { top: number }).top;
    expect(top).toBeGreaterThan(1000 * 40);
  });

  it("scrollToIndex scrolls a non-virtualized row via the scroll box", () => {
    const apiRef = createRef<TreeDataGridApi>();
    render(<TreeDataGrid columns={flat} {...base} apiRef={apiRef} testId="sc" />);
    const box = screen.getByTestId("sc");
    const row = screen.getByTestId("tree-row-b");
    Object.defineProperty(row, "offsetTop", { value: 300 });
    apiRef.current!.scrollToIndex(1);
    expect(box.scrollTop).toBe(300);
  });
});

describe("TreeDataGrid filterTriggerTestId", () => {
  const cols: ColumnDef<Row>[] = [{ id: "name", type: "string", header: "Name", accessorKey: "name", filterable: true }];
  it("renames the filter funnel's test id; default is unchanged", () => {
    const common = { columns: cols, ...base, gridState: { filter: null, sort: [] }, onGridStateChange: () => {} };
    const { rerender } = render(<TreeDataGrid {...common} />);
    expect(screen.getByTestId("filter-trigger-name")).toBeInTheDocument();
    rerender(<TreeDataGrid {...common} filterTriggerTestId={(id) => `mx-filter-${id}`} />);
    expect(screen.getByTestId("mx-filter-name")).toBeInTheDocument();
    expect(screen.queryByTestId("filter-trigger-name")).not.toBeInTheDocument();
  });
});

describe("TreeDataGrid cellPadding", () => {
  it("compact tightens body cells; default keeps p-2", () => {
    const { rerender } = render(<TreeDataGrid columns={flat} {...base} />);
    expect(screen.getByTestId("tree-row-b").querySelector("td")!.className).toContain("p-2");
    rerender(<TreeDataGrid columns={flat} {...base} cellPadding="compact" />);
    const td = screen.getByTestId("tree-row-b").querySelector("td")!;
    expect(td.className).toContain("px-2");
    expect(td.className).toContain("py-0.5");
    expect(td.className).not.toContain("p-2");
  });
});
