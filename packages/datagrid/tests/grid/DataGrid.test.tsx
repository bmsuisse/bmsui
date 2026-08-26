import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import { DataGrid } from "../../src/grid/DataGrid";
import type { GridState } from "../../src/filter/types";
import type { MenuItem } from "../../src/menu/types";

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
  { id: "name", type: "string", header: "Name", accessorKey: "name", sortable: true, filterable: true },
  { id: "age", type: "number", header: "Age", accessorKey: "age", sortable: true, filterable: true },
];

// @tanstack/react-virtual reads the scroll element's `offsetHeight` (a live
// DOM property), not `getBoundingClientRect()` — jsdom has no real layout
// engine, so both default to 0 unless overridden directly.
async function withMockedOffsetHeight(height: number, run: () => void | Promise<void>): Promise<void> {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: height });
  try {
    await run();
  } finally {
    if (original) Object.defineProperty(HTMLElement.prototype, "offsetHeight", original);
  }
}

function nameCellsInOrder(): string[] {
  // Matches on the `row-<id>` testid rather than slicing off N header rows --
  // the thead can hold one row (header) or two (header + the optional
  // filter row), and this stays correct regardless of which.
  const dataRows = screen.getAllByTestId(/^row-/);
  return dataRows.map((row) => within(row).getAllByRole("cell")[0]?.textContent ?? "");
}

describe("DataGrid (client mode)", () => {
  it("renders headers and rows in the given order", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
      />,
    );

    expect(screen.getByRole("columnheader", { name: /Name/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Age/ })).toBeInTheDocument();
    expect(nameCellsInOrder()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("stripes odd rows by default", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
      />,
    );

    const dataRows = screen.getAllByTestId(/^row-/);
    expect(dataRows[0]).not.toHaveClass("bg-foreground/5");
    expect(dataRows[1]).toHaveClass("bg-foreground/5");
    expect(dataRows[2]).not.toHaveClass("bg-foreground/5");
  });

  it("omits zebra striping when zebra is false", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        zebra={false}
      />,
    );

    for (const row of screen.getAllByTestId(/^row-/)) {
      expect(row).not.toHaveClass("bg-foreground/5");
    }
  });

  it("sorts ascending then descending on repeated header clicks", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
      />,
    );

    const sortButton = screen.getByRole("button", { name: "Name" });

    await userEvent.click(sortButton);
    expect(nameCellsInOrder()).toEqual(["Alice", "Bob", "Charlie"]);

    await userEvent.click(sortButton);
    expect(nameCellsInOrder()).toEqual(["Charlie", "Bob", "Alice"]);

    // A third click clears the sort back to the original insertion order.
    await userEvent.click(sortButton);
    expect(nameCellsInOrder()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("sorts descending first, then ascending, when sortDescFirst is set", async () => {
    const descFirstColumns: ColumnDef<Row>[] = [columns[0]!, { ...columns[1]!, sortDescFirst: true }];
    render(
      <DataGrid columns={descFirstColumns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );

    const sortButton = screen.getByRole("button", { name: "Age" });

    await userEvent.click(sortButton);
    expect(nameCellsInOrder()).toEqual(["Bob", "Charlie", "Alice"]); // 40, 30, 25 desc

    await userEvent.click(sortButton);
    expect(nameCellsInOrder()).toEqual(["Alice", "Charlie", "Bob"]); // 25, 30, 40 asc

    await userEvent.click(sortButton);
    expect(nameCellsInOrder()).toEqual(["Charlie", "Alice", "Bob"]); // back to insertion order
  });

  it("filters rows via the column's default filter widget", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    const input = await screen.findByPlaceholderText("Filter name...");
    await userEvent.type(input, "Ali");

    expect(nameCellsInOrder()).toEqual(["Alice"]);
  });

  it("opens a default enum column's filter to the option list in one click, not two", async () => {
    // Regression test: EnumFilter (and DateRangeFilter) render their own
    // self-contained Label+Popover+trigger Button, needed under
    // filterDisplay: "row" -- but under the default filterDisplay:
    // "popover" exercised here, <DataGrid> already supplies a header filter
    // icon + popover of its own. Without renderDefaultFilterWidget passing
    // bare through, this would nest a second popover inside the first,
    // requiring a click on the header icon AND then on EnumFilter's own
    // trigger just to see the option list.
    const statusColumns: ColumnDef<Row>[] = [
      columns[0]!,
      {
        id: "status",
        type: "enum",
        header: "Status",
        accessorKey: "name",
        filterable: true,
        options: [{ value: "a", label: "Status A" }],
      },
    ];
    render(
      <DataGrid columns={statusColumns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Status" }));
    expect(screen.getByText("Status A")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Any status/ })).not.toBeInTheDocument();
  });

  it("paginates using Previous/Next", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        initialState={{ pageSize: 2 }}
      />,
    );

    expect(nameCellsInOrder()).toEqual(["Charlie", "Alice"]);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(nameCellsInOrder()).toEqual(["Bob"]);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(nameCellsInOrder()).toEqual(["Charlie", "Alice"]);
  });

  it("shows a 'No results' row when the filtered set is empty", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    const input = await screen.findByPlaceholderText("Filter name...");
    await userEvent.type(input, "zzz-no-match");

    expect(screen.getByText("No results.")).toBeInTheDocument();
  });
});

describe("DataGrid (row/header actions)", () => {
  it("renders a per-row kebab menu from rowActions and invokes onSelect with that row", async () => {
    const onSelect = vi.fn();
    const rowActions: MenuItem<Row>[] = [{ id: "edit", label: "Edit", onSelect }];
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        rowActions={rowActions}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Row actions for 1" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));

    expect(onSelect).toHaveBeenCalledWith({ row: rows[0] });
  });

  it("supports selecting rows and invokes headerActions with selectedRows", async () => {
    const onSelect = vi.fn();
    const headerActions: MenuItem<Row>[] = [{ id: "bulk", label: "Bulk archive", onSelect }];
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        headerActions={headerActions}
      />,
    );

    expect(screen.getByText("0 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Select row 1" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Bulk actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Bulk archive" }));

    expect(onSelect).toHaveBeenCalledWith({ selectedRows: [rows[0]] });
  });

  it("selects and deselects every row on the page via the header checkbox", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        headerActions={[{ id: "bulk", label: "Bulk", onSelect: vi.fn() }]}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows on this page" }));
    expect(screen.getByText("3 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows on this page" }));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("reads selection from a controlled `selectedIds` set, not just from clicks inside the grid", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        headerActions={[{ id: "bulk", label: "Bulk", onSelect: vi.fn() }]}
        selectedIds={new Set(["1", "3"])}
        onSelectedIdsChange={vi.fn()}
      />,
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select row 1" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select row 2" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select row 3" })).toBeChecked();
  });

  it("renders the checkbox column from controlled selectedIds alone, with no headerActions bulk-actions bar", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        onSelectedIdsChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Select all rows on this page" })).toBeInTheDocument();
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bulk actions" })).not.toBeInTheDocument();
  });

  it("calls onSelectedIdsChange instead of managing selection internally when controlled", async () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        headerActions={[{ id: "bulk", label: "Bulk", onSelect: vi.fn() }]}
        selectedIds={new Set()}
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Select row 2" }));
    expect(onSelectedIdsChange).toHaveBeenCalledWith(new Set(["2"]));
    // Controlled: the caller didn't feed the new set back in via the
    // `selectedIds` prop (still `new Set()` from the initial render), so the
    // checkbox must stay unchecked -- proof this isn't quietly falling back
    // to internal state despite being controlled.
    expect(screen.getByRole("checkbox", { name: "Select row 2" })).not.toBeChecked();
  });
});

describe("DataGrid (columnVisibility)", () => {
  it("renders every column when columnVisibility is omitted", () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    expect(screen.getByRole("columnheader", { name: /Name/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Age/ })).toBeInTheDocument();
  });

  it("hides a column whose id is set to false in columnVisibility", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        columnVisibility={{ age: false }}
      />,
    );
    expect(screen.getByRole("columnheader", { name: /Name/ })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Age/ })).not.toBeInTheDocument();
    // and no cell data for the hidden column leaks into the row either
    expect(screen.queryByText("30")).not.toBeInTheDocument();
  });

  it("accounts for hidden columns in the 'No results' colSpan", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        columnVisibility={{ age: false }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    await userEvent.type(await screen.findByPlaceholderText("Filter name..."), "zzz-no-match");

    const cell = screen.getByText("No results.");
    expect(cell).toHaveAttribute("colspan", "1");
  });
});

describe("DataGrid (filter display)", () => {
  it("renders no filter row at all when no column opts into filterDisplay: 'row'", () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    expect(screen.queryByTestId("filter-row")).not.toBeInTheDocument();
  });

  it("renders a row-display column's widget inline, with no header filter icon, while other columns keep their popover icon", async () => {
    const rowDisplayColumns: ColumnDef<Row>[] = [
      columns[0]!,
      { ...columns[1]!, filterDisplay: "row" },
    ];
    render(
      <DataGrid columns={rowDisplayColumns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );

    expect(screen.getByTestId("filter-row")).toBeInTheDocument();
    // Age's own compact trigger lives in the filter row -- exactly one
    // "Filter Age" button, not a second one from a header icon too.
    expect(screen.getAllByRole("button", { name: "Filter Age" })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Filter Age" }));
    expect(screen.getByLabelText("Age minimum")).toBeInTheDocument();
    // Name is untouched: still the header-icon + popover default.
    expect(screen.getByRole("button", { name: "Filter Name" })).toBeInTheDocument();
  });

  it("filters rows by typing directly into a row-display widget", async () => {
    const rowDisplayColumns: ColumnDef<Row>[] = [columns[0]!, { ...columns[1]!, filterDisplay: "row" }];
    render(
      <DataGrid columns={rowDisplayColumns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Age" }));
    await userEvent.type(screen.getByLabelText("Age minimum"), "35");
    expect(nameCellsInOrder()).toEqual(["Bob"]);
  });

  it("uses a column's renderFilter override instead of the type-based default, in either display mode", async () => {
    const onChangeSpy = vi.fn();
    const customColumns: ColumnDef<Row>[] = [
      columns[0]!,
      {
        ...columns[1]!,
        filterDisplay: "row",
        renderFilter: (value, onChange, _filter) => (
          <button
            type="button"
            data-testid="custom-age-filter"
            onClick={() => {
              onChange({ field: "age", operator: "gte", value: 35 });
              onChangeSpy(value);
            }}
          >
            Custom age filter
          </button>
        ),
      },
    ];
    render(
      <DataGrid columns={customColumns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );

    expect(screen.queryByLabelText("Age minimum")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("custom-age-filter"));
    expect(nameCellsInOrder()).toEqual(["Bob"]);
    expect(onChangeSpy).toHaveBeenCalledWith(undefined);
  });

  it("uses a column's renderHeader override instead of its plain-text header, with the sort caret still alongside it", async () => {
    const customColumns: ColumnDef<Row>[] = [
      columns[0]!,
      {
        ...columns[1]!,
        sortable: true,
        renderHeader: (column) => <span data-testid="custom-age-header">Rich {column.header}</span>,
      },
    ];
    render(
      <DataGrid columns={customColumns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );

    expect(screen.getByTestId("custom-age-header")).toHaveTextContent("Rich Age");
    expect(screen.queryByRole("button", { name: "Age" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("custom-age-header"));
    expect(screen.getByRole("button", { name: /Rich Age/ }).querySelector("svg")).toBeInTheDocument();
  });

  it("doesn't wrap a non-sortable column's renderHeader in a button, so nested interactive content stays clickable", async () => {
    // Regression test: the leaf header cell always wrapped `renderHeader` output
    // in a `<button disabled={!sortable}>` for the sort toggle. A *disabled*
    // button suppresses pointer events for its entire DOM subtree in real
    // browsers (jsdom doesn't model this, so this asserts the DOM shape
    // directly rather than relying on a simulated click to catch it) — any
    // interactive element a non-sortable column's own `renderHeader` embeds
    // (a bare filter input, an "approve/reject all" button) was silently
    // unclickable even though nothing looked wrong visually.
    const onClickSpy = vi.fn();
    const customColumns: ColumnDef<Row>[] = [
      columns[0]!,
      {
        ...columns[1]!,
        sortable: false,
        renderHeader: () => (
          <button type="button" data-testid="reject-all" onClick={onClickSpy}>
            Reject all
          </button>
        ),
      },
    ];
    render(
      <DataGrid columns={customColumns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );

    const rejectAll = screen.getByTestId("reject-all");
    expect(rejectAll.closest("button[disabled]")).toBeNull();
    await userEvent.click(rejectAll);
    expect(onClickSpy).toHaveBeenCalledOnce();
  });
});

describe("DataGrid (renderDetail)", () => {
  it("renders no expand column at all when renderDetail is omitted", () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    expect(screen.queryByRole("button", { name: /Expand row/ })).not.toBeInTheDocument();
  });

  it("expands a row to show renderDetail's content, and collapses it again", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        renderDetail={(row) => <div data-testid="detail-content">Detail for {row.name}</div>}
      />,
    );

    expect(screen.queryByTestId("detail-content")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Expand row 1" }));
    expect(screen.getByTestId("row-1-detail")).toHaveTextContent("Detail for Charlie");
    expect(screen.getByRole("button", { name: "Collapse row 1" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Collapse row 1" }));
    expect(screen.queryByTestId("row-1-detail")).not.toBeInTheDocument();
  });

  it("renders the expand toggle with a full icon-button hit target, not just the bare chevron", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        renderDetail={(row) => <div>Detail for {row.name}</div>}
      />,
    );
    // `size="icon"` -> 36px (h-9 w-9), well past a bare 16px chevron glyph --
    // small enough hit targets are what made the button hard to press.
    expect(screen.getByRole("button", { name: "Expand row 1" })).toHaveClass("h-9", "w-9");
  });

  it("allows multiple rows to be expanded simultaneously", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        renderDetail={(row) => <div>Detail for {row.name}</div>}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Expand row 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Expand row 2" }));

    expect(screen.getByTestId("row-1-detail")).toBeInTheDocument();
    expect(screen.getByTestId("row-2-detail")).toBeInTheDocument();
  });

  it("accounts for the expand column in the 'No results' colSpan", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        renderDetail={() => null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    await userEvent.type(await screen.findByPlaceholderText("Filter name..."), "zzz-no-match");

    expect(screen.getByText("No results.")).toHaveAttribute("colspan", "3");
  });

  it("keeps an expanded detail row inside the SAME <tbody> as its main row, so a virtualizer measures both as one unit", async () => {
    await withMockedOffsetHeight(400, async () => {
      render(
        <DataGrid
          columns={columns}
          dataSource={{ mode: "client", data: rows }}
          getRowId={(row) => row.id}
          renderDetail={(row) => <div>Detail for {row.name}</div>}
          virtualize={{ threshold: 0 }}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Expand row 1" }));
      const mainRow = screen.getByTestId("row-1");
      const detailRow = screen.getByTestId("row-1-detail");
      expect(detailRow.closest("tbody")).toBe(mainRow.closest("tbody"));
      // Also true when not expanded -- every row still gets its own
      // <tbody>, just with nothing else inside it.
      expect(mainRow.closest("tbody")).not.toBeNull();
    });
  });
});

describe("DataGrid (column pinning)", () => {
  it("applies no side-pinning offset to a column without `pinned`", () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    // Every header cell sticks to the top of the scroll container regardless
    // of pinning (see the "sticky header" describe block below) -- what a
    // *pinned* column additionally gets is a left/right inline offset.
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(header.style.left).toBe("");
    expect(header.style.right).toBe("");
  });

  it("pins a single left column at offset 0", () => {
    const pinned: ColumnDef<Row>[] = [{ ...columns[0]!, pinned: "left", width: 120 }, columns[1]!];
    render(
      <DataGrid columns={pinned} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(header).toHaveClass("sticky");
    expect(header).toHaveStyle({ left: "0px" });
  });

  it("stacks two left-pinned columns using the first's width as the second's offset", () => {
    const pinned: ColumnDef<Row>[] = [
      { ...columns[0]!, pinned: "left", width: 120 },
      { ...columns[1]!, pinned: "left", width: 80 },
    ];
    render(
      <DataGrid columns={pinned} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveStyle({ left: "0px" });
    expect(screen.getByRole("columnheader", { name: /Age/ })).toHaveStyle({ left: "120px" });
  });

  it("pins a right column at offset 0, stacking a second right-pinned column further out", () => {
    const pinned: ColumnDef<Row>[] = [
      columns[0]!,
      { ...columns[1]!, pinned: "right", width: 90 },
      { id: "extra", type: "string", header: "Extra", accessorKey: "name", pinned: "right", width: 60 },
    ];
    render(
      <DataGrid columns={pinned} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    // Rightmost visible column (Extra) sits flush right; Age stacks outward from it.
    expect(screen.getByRole("columnheader", { name: /Extra/ })).toHaveStyle({ right: "0px" });
    expect(screen.getByRole("columnheader", { name: /Age/ })).toHaveStyle({ right: "60px" });
  });

  it("applies the same pinned offset to a pinned column's body cells", () => {
    const pinned: ColumnDef<Row>[] = [{ ...columns[0]!, pinned: "left", width: 120 }, columns[1]!];
    render(
      <DataGrid columns={pinned} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    const firstRow = screen.getByTestId("row-1");
    const nameCell = within(firstRow).getAllByRole("cell")[0]!;
    expect(nameCell).toHaveClass("sticky");
    expect(nameCell).toHaveStyle({ left: "0px" });
  });

  it("reserves space for the expand column so a pinned column doesn't stick at offset 0 over it", () => {
    const pinned: ColumnDef<Row>[] = [{ ...columns[0]!, pinned: "left", width: 120 }, columns[1]!];
    render(
      <DataGrid
        columns={pinned}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        renderDetail={(row) => <div>Detail for {row.name}</div>}
      />,
    );

    // The pinned "Name" column must start after the expand column's own
    // width, not at 0 -- otherwise it sticks directly on top of the expand
    // button once the grid scrolls horizontally, hiding it.
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveStyle({ left: "44px" });

    const firstRow = screen.getByTestId("row-1");
    const expandButton = within(firstRow).getByRole("button", { name: "Expand row 1" });
    const expandCell = expandButton.closest("td")!;
    expect(expandCell).toHaveClass("sticky");
    expect(expandCell).toHaveStyle({ left: "0px" });
  });

  it("stacks a pinned column after both the expand and selection columns", () => {
    const pinned: ColumnDef<Row>[] = [{ ...columns[0]!, pinned: "left", width: 120 }, columns[1]!];
    render(
      <DataGrid
        columns={pinned}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        renderDetail={(row) => <div>Detail for {row.name}</div>}
        selectedIds={new Set()}
      />,
    );

    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveStyle({ left: "88px" });
  });
});

describe("DataGrid (sticky header)", () => {
  it("sticks every leaf header cell to the top of the scroll container", () => {
    render(<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(header).toHaveClass("sticky", "top-0", "z-20", "bg-muted");
  });

  it("sticks the structural selection header cell to the top of the scroll container too", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        onSelectedIdsChange={vi.fn()}
      />,
    );
    const selectAllHeader = screen.getByRole("checkbox", { name: "Select all rows on this page" }).closest("th");
    expect(selectAllHeader).toHaveClass("sticky", "top-0", "z-20");
  });

  it("keeps a pinned column's header cell both top-sticky and side-pinned at once", () => {
    const pinned: ColumnDef<Row>[] = [{ ...columns[0]!, pinned: "left", width: 120 }, columns[1]!];
    render(<DataGrid columns={pinned} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(header).toHaveClass("sticky", "top-0", "z-20");
    expect(header).toHaveStyle({ left: "0px" });
  });

  it("does not sticky the filter row (only the leaf label row)", () => {
    const filterable: ColumnDef<Row>[] = [{ ...columns[0]!, filterable: true, filterDisplay: "row" }, columns[1]!];
    render(<DataGrid columns={filterable} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    const filterCell = screen.getByTestId("filter-row").querySelector("th");
    expect(filterCell).not.toHaveClass("sticky");
  });
});

describe("DataGrid (headerGroup)", () => {
  it("renders a single header row when no column sets headerGroup", () => {
    render(<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    expect(screen.queryByTestId("header-group-row")).not.toBeInTheDocument();
  });

  it("merges contiguous columns sharing the same headerGroup into one spanning cell", () => {
    const grouped: ColumnDef<Row>[] = [
      { ...columns[0]!, headerGroup: "Details" },
      { ...columns[1]!, headerGroup: "Details" },
    ];
    render(<DataGrid columns={grouped} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    const groupCell = within(screen.getByTestId("header-group-row")).getByText("Details");
    expect(groupCell.tagName).toBe("TH");
    expect(groupCell).toHaveAttribute("colspan", "2");
    // The leaf row still renders each grouped column's own sortable header.
    expect(screen.getByRole("columnheader", { name: /Name/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Age/ })).toBeInTheDocument();
  });

  it("spans an ungrouped column across both header rows instead of leaving a blank cell above it", () => {
    const mixed: ColumnDef<Row>[] = [columns[0]!, { ...columns[1]!, headerGroup: "Details" }];
    render(<DataGrid columns={mixed} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    const nameHeader = screen.getByRole("columnheader", { name: /Name/ });
    expect(nameHeader).toHaveAttribute("rowspan", "2");
    // Rendered once, inside the group row, not duplicated into the leaf row.
    expect(within(screen.getByTestId("header-group-row")).getByRole("columnheader", { name: /Name/ })).toBe(
      nameHeader,
    );
  });

  it("treats same-label headerGroup columns as separate runs when not adjacent", () => {
    const nonAdjacent: ColumnDef<Row>[] = [
      { ...columns[0]!, headerGroup: "Details" },
      { id: "extra", type: "string", header: "Extra", accessorKey: "name" },
      { ...columns[1]!, headerGroup: "Details" },
    ];
    render(
      <DataGrid columns={nonAdjacent} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    const groupCells = within(screen.getByTestId("header-group-row")).getAllByText("Details");
    expect(groupCells).toHaveLength(2);
    expect(groupCells[0]).toHaveAttribute("colspan", "1");
    expect(groupCells[1]).toHaveAttribute("colspan", "1");
  });

  it("keeps sort and filter working on a column inside a headerGroup run", async () => {
    const grouped: ColumnDef<Row>[] = [
      { ...columns[0]!, headerGroup: "Details" },
      { ...columns[1]!, headerGroup: "Details" },
    ];
    render(<DataGrid columns={grouped} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(nameCellsInOrder()).toEqual(["Alice", "Bob", "Charlie"]);
    await userEvent.click(screen.getByRole("button", { name: "Filter Age" }));
    expect(await screen.findByPlaceholderText("Min")).toBeInTheDocument();
  });
});

describe("DataGrid (column resizing)", () => {
  it("renders no resize handle when enableColumnResizing is omitted (default false)", () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    expect(screen.queryByTestId("resize-handle-name")).not.toBeInTheDocument();
  });

  it("renders a resize handle per column once enableColumnResizing is true", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        enableColumnResizing
      />,
    );
    expect(screen.getByTestId("resize-handle-name")).toBeInTheDocument();
    expect(screen.getByTestId("resize-handle-age")).toBeInTheDocument();
  });

  it("gives every column a concrete width once enableColumnResizing is true, even without an explicit `width`", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        enableColumnResizing
      />,
    );
    // Neither `columns[0]` (name) nor `columns[1]` (age) set an explicit `width` --
    // TanStack's own 150px default kicks in once resizing is enabled at all.
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveStyle({ width: "150px" });
  });

  it("applies a controlled `columnSizing` value to that column's rendered width", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        enableColumnResizing
        columnSizing={{ age: 300 }}
        onColumnSizingChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("columnheader", { name: /Age/ })).toHaveStyle({ width: "300px" });
  });

  // Regression test: with no `columnSizing`/`onColumnSizingChange` passed (the
  // common, uncontrolled case), <DataGrid> used to never give `useTable` a
  // `state.columnSizing`/`onColumnSizingChange` at all, so every drag was
  // silently discarded and no column ever resized — see DataGrid.tsx's
  // `internalColumnSizing` comment.
  it("resizes an uncontrolled column by dragging its handle, with no columnSizing prop passed", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        enableColumnResizing
      />,
    );
    const handle = screen.getByTestId("resize-handle-name");
    fireEvent.mouseDown(handle, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 50 });
    fireEvent.mouseUp(document, { clientX: 50 });
    // 150px is TanStack's own default for a column with no explicit `width` (see above).
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveStyle({ width: "200px" });
  });

  // Regression test: real browsers' default `table-layout: auto` treats a
  // cell's `style.width` as a loose hint (weighed against every other cell's
  // content across the whole column), not a hard constraint — jsdom's lack
  // of real layout can't catch this, so this only pins down the mechanism
  // (the `table-fixed` class), not the rendered result itself.
  it("renders table-fixed once enableColumnResizing is true, so pixel widths actually apply", () => {
    const { rerender } = render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    expect(screen.getByRole("table")).not.toHaveClass("table-fixed");

    rerender(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        enableColumnResizing
      />,
    );
    expect(screen.getByRole("table")).toHaveClass("table-fixed");
  });
});

describe("DataGrid (virtualize)", () => {
  it("renders every row directly (no windowing) when virtualize is omitted", () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    expect(screen.getAllByTestId(/^row-/)).toHaveLength(3);
  });

  it("renders every row directly when the row count is below the threshold", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        virtualize={{ threshold: 100 }}
      />,
    );
    expect(screen.getAllByTestId(/^row-/)).toHaveLength(3);
  });

  it("virtualizes large row sets: not every row is in the DOM at once", async () => {
    await withMockedOffsetHeight(400, () => {
      const manyRows: Row[] = Array.from({ length: 300 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}`, age: i }));
      render(
        <DataGrid
          columns={columns}
          dataSource={{ mode: "client", data: manyRows }}
          getRowId={(row) => row.id}
          virtualize={{ threshold: 50 }}
        />,
      );
      expect(screen.getAllByTestId(/^row-/).length).toBeLessThan(300);
    });
  });

  it("calls onEndReached once scrolling reaches the last currently-loaded row", async () => {
    await withMockedOffsetHeight(400, () => {
      const onEndReached = vi.fn();
      render(
        <DataGrid
          columns={columns}
          dataSource={{ mode: "client", data: rows }}
          getRowId={(row) => row.id}
          virtualize={{ threshold: 0, overscan: 50, onEndReached }}
        />,
      );
      expect(onEndReached).toHaveBeenCalledTimes(1);
    });
  });

  it("does not call onEndReached while hasMore is false", async () => {
    await withMockedOffsetHeight(400, () => {
      const onEndReached = vi.fn();
      render(
        <DataGrid
          columns={columns}
          dataSource={{ mode: "client", data: rows }}
          getRowId={(row) => row.id}
          virtualize={{ threshold: 0, overscan: 50, onEndReached, hasMore: false }}
        />,
      );
      expect(onEndReached).not.toHaveBeenCalled();
    });
  });
});

describe("DataGrid (groupBy)", () => {
  const groupByTier = (row: Row): string => (row.age >= 30 ? "Senior" : "Junior");

  it("buckets rows in first-seen order, with a default 'key (count)' header label, expanded by default", () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} groupBy={groupByTier} />,
    );
    // Charlie (30) is the first row, so "Senior" is the first-seen bucket,
    // even though "Junior" (Alice, 25) sorts earlier if you sorted the keys.
    expect(screen.getByText("Senior (2)")).toBeInTheDocument();
    expect(screen.getByText("Junior (1)")).toBeInTheDocument();
    expect(nameCellsInOrder()).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("supports a renderGroupHeader override", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        groupBy={groupByTier}
        renderGroupHeader={(key, groupRows) => `${key} tier — ${groupRows.length} people`}
      />,
    );
    expect(screen.getByText("Senior tier — 2 people")).toBeInTheDocument();
  });

  it("collapsing one group hides only its own rows", async () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} groupBy={groupByTier} />,
    );
    await userEvent.click(screen.getByText("Senior (2)"));
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("supports controlled expandedGroups/onExpandedGroupsChange", async () => {
    const onExpandedGroupsChange = vi.fn();
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        groupBy={groupByTier}
        expandedGroups={{ Senior: true, Junior: false }}
        onExpandedGroupsChange={onExpandedGroupsChange}
      />,
    );
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Senior (2)"));
    expect(onExpandedGroupsChange).toHaveBeenCalledWith({ Senior: false, Junior: false });
  });

  it("forces virtualization off when combined with groupBy, even below the row-count threshold check", async () => {
    await withMockedOffsetHeight(100, () => {
      const manyRows: Row[] = Array.from({ length: 300 }, (_, i) => ({ id: `r${i}`, name: `Row ${i}`, age: i }));
      render(
        <DataGrid
          columns={columns}
          dataSource={{ mode: "client", data: manyRows }}
          getRowId={(row) => row.id}
          groupBy={() => "All"}
          virtualize={{ threshold: 0 }}
          initialState={{ pageSize: 300 }}
        />,
      );
      // If virtualization silently won, the small mocked viewport height would
      // keep far fewer than 300 rows in the DOM at once.
      expect(screen.getAllByTestId(/^row-/)).toHaveLength(300);
    });
  });

  it("spans the group-header row across every column, including selection/detail/row-actions", () => {
    const rowActions: MenuItem<Row>[] = [{ id: "edit", label: "Edit", onSelect: () => {} }];
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        groupBy={groupByTier}
        selectedIds={new Set()}
        onSelectedIdsChange={() => {}}
        renderDetail={(row) => <div>{row.name} detail</div>}
        rowActions={rowActions}
      />,
    );
    // columns(2) + selection(1) + detail(1) + rowActions(1) = 5
    const groupHeaderCell = screen.getByText("Senior (2)").closest("td")!;
    expect(groupHeaderCell).toHaveAttribute("colspan", "5");
  });

  it("sticks the group-header row below the real header while its rows scroll past", () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} groupBy={groupByTier} />,
    );
    const groupHeaderCell = screen.getByText("Senior (2)").closest("td")!;
    expect(groupHeaderCell).toHaveClass("sticky", "z-20", "bg-muted");
    expect(groupHeaderCell.style.top).not.toBe("");
  });

  it("omits the group-header shading when zebra is false", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        groupBy={groupByTier}
        zebra={false}
      />,
    );
    const groupHeaderCell = screen.getByText("Senior (2)").closest("td")!;
    expect(groupHeaderCell).not.toHaveClass("bg-muted");
    expect(groupHeaderCell).toHaveClass("bg-background", "sticky");
  });
});

describe("DataGrid (getRowProps)", () => {
  it("spreads caller-supplied props (onClick, data-*, className) onto each row's <tr>", async () => {
    const onRowClick = vi.fn();
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        getRowProps={(row) => ({
          onClick: () => onRowClick(row.id),
          className: "cursor-pointer",
          "data-name": row.name,
        })}
      />,
    );
    const firstRow = screen.getByTestId("row-1");
    expect(firstRow).toHaveClass("cursor-pointer");
    expect(firstRow).toHaveAttribute("data-name", "Charlie");
    await userEvent.click(firstRow);
    expect(onRowClick).toHaveBeenCalledWith("1");
  });

  it("keeps DataGrid's own data-testid/data-index even if getRowProps returns colliding keys", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        getRowProps={() => ({ "data-testid": "should-not-win" })}
      />,
    );
    expect(screen.getByTestId("row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("should-not-win")).not.toBeInTheDocument();
  });

  it("does not fire a row-wide onClick from getRowProps when the expand chevron is clicked instead", async () => {
    const onRowClick = vi.fn();
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        getRowProps={(row) => ({ onClick: () => onRowClick(row.id) })}
        renderDetail={(row) => <div>Detail for {row.name}</div>}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand row 1" }));
    expect(screen.getByText("Detail for Charlie")).toBeInTheDocument();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("does not fire a row-wide onClick from getRowProps when the selection checkbox is clicked instead", async () => {
    const onRowClick = vi.fn();
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        getRowProps={(row) => ({ onClick: () => onRowClick(row.id) })}
        headerActions={[{ id: "delete", label: "Delete", onSelect: () => {} }]}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Select row 1" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("does not fire a row-wide onClick from getRowProps when the rowActions kebab trigger is clicked instead", async () => {
    const onRowClick = vi.fn();
    const rowActions: MenuItem<Row>[] = [{ id: "edit", label: "Edit", onSelect: () => {} }];
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        getRowProps={(row) => ({ onClick: () => onRowClick(row.id) })}
        rowActions={rowActions}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Row actions for 1" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("DataGrid (getRowTestId)", () => {
  it("overrides the default row-${id} data-testid with the entity-specific one supplied", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        getRowTestId={(row) => `person-row-${row.id}`}
      />,
    );
    expect(screen.getByTestId("person-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("row-1")).not.toBeInTheDocument();
  });

  it("suffixes the overridden testid for the expanded detail row too", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        getRowTestId={(row) => `person-row-${row.id}`}
        renderDetail={(row) => <div>Detail for {row.name}</div>}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand row 1" }));
    expect(screen.getByTestId("person-row-1-detail")).toBeInTheDocument();
  });

  it("still wins over a colliding data-testid returned from getRowProps", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        getRowTestId={(row) => `person-row-${row.id}`}
        getRowProps={() => ({ "data-testid": "should-not-win" })}
      />,
    );
    expect(screen.getByTestId("person-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("should-not-win")).not.toBeInTheDocument();
  });

  it("falls back to the default row-${id} convention when omitted", () => {
    render(<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    expect(screen.getByTestId("row-1")).toBeInTheDocument();
  });
});

describe("DataGrid (loading)", () => {
  it("shows a loading overlay in client mode when the loading prop is true", () => {
    render(<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} loading />);
    expect(screen.getByTestId("datagrid-loading-overlay")).toBeInTheDocument();
  });

  it("does not show a loading overlay by default", () => {
    render(<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    expect(screen.queryByTestId("datagrid-loading-overlay")).not.toBeInTheDocument();
  });

  it("shows the overlay in server mode too when the top-level loading prop is set, independent of dataSource.loading", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "server", data: rows, rowCount: rows.length, onStateChange: vi.fn() }}
        getRowId={(row) => row.id}
        loading
      />,
    );
    expect(screen.getByTestId("datagrid-loading-overlay")).toBeInTheDocument();
  });

  it("still shows the overlay in server mode via dataSource.loading alone", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "server", data: rows, rowCount: rows.length, loading: true, onStateChange: vi.fn() }}
        getRowId={(row) => row.id}
      />,
    );
    expect(screen.getByTestId("datagrid-loading-overlay")).toBeInTheDocument();
  });

  it("still renders the table rows underneath the overlay", () => {
    render(<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} loading />);
    expect(screen.getByTestId("row-1")).toBeInTheDocument();
  });
});

describe("DataGrid (showPagination)", () => {
  it("renders the Previous/Next footer by default", () => {
    render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
  });

  it("renders no pagination footer when showPagination is false", () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data: rows }}
        getRowId={(row) => row.id}
        showPagination={false}
      />,
    );
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });
});

describe("DataGrid (testId)", () => {
  it("sets data-testid on the scrollable container when given, and omits the attribute entirely when not", () => {
    const { rerender } = render(
      <DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} testId="my-scroll" />,
    );
    expect(screen.getByTestId("my-scroll")).toBeInTheDocument();

    rerender(<DataGrid columns={columns} dataSource={{ mode: "client", data: rows }} getRowId={(row) => row.id} />);
    expect(screen.queryByTestId("my-scroll")).not.toBeInTheDocument();
  });
});

describe("DataGrid (server mode)", () => {
  it("renders exactly the page it's given and calls onStateChange on sort", async () => {
    const onStateChange = vi.fn<(state: GridState) => void>();
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "server", data: [rows[0]!], rowCount: 3, onStateChange }}
        getRowId={(row) => row.id}
      />,
    );

    expect(nameCellsInOrder()).toEqual(["Charlie"]);

    await userEvent.click(screen.getByRole("button", { name: "Name" }));

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: [{ field: "name", dir: "asc" }] }),
    );
    // Server mode never re-filters/re-sorts locally — the single row it was
    // handed is still exactly what's rendered, regardless of sort/filter state.
    expect(nameCellsInOrder()).toEqual(["Charlie"]);
  });

  it("resyncs internal state when a new `gridState` is pushed in, without remounting", async () => {
    const onStateChange = vi.fn<(state: GridState) => void>();
    const seeded: GridState = { filter: null, sort: [{ field: "name", dir: "asc" }], page: 0, pageSize: 20 };
    const { rerender } = render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "server", data: rows, rowCount: rows.length, onStateChange }}
        getRowId={(row) => row.id}
        gridState={seeded}
      />,
    );

    const cleared: GridState = { filter: null, sort: [], page: 0, pageSize: 20 };
    rerender(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "server", data: rows, rowCount: rows.length, onStateChange }}
        getRowId={(row) => row.id}
        gridState={cleared}
      />,
    );

    // If the push-in didn't take effect, internal sort would still be "asc"
    // (from `seeded`) and clicking once would cycle to "desc" -- asserting
    // the toggle lands back on "asc" is what actually proves the resync
    // happened, not just that clicking still does *something*.
    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: [{ field: "name", dir: "asc" }] }),
    );
  });
});
