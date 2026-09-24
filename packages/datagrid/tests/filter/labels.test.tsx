import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BooleanColumn, ColumnDef, EnumColumn, NumberColumn } from "../../src/column/types";
import { BooleanFilter } from "../../src/filter/BooleanFilter";
import { EnumFilter } from "../../src/filter/EnumFilter";
import type { FilterLabels } from "../../src/filter/labels";
import { FilterLabelsProvider, defaultFilterLabels, mergeFilterLabels } from "../../src/filter/labels";
import { NumberRangeFilter } from "../../src/filter/NumberRangeFilter";
import { DataGrid } from "../../src/grid/DataGrid";

interface Row {
  id: string;
  status: string;
  amount: number;
  paid: boolean;
}

const statusColumn: EnumColumn<Row> = {
  id: "status",
  type: "enum",
  header: "Status",
  options: [
    { value: "open", label: "Open", group: "Active" },
    { value: "closed", label: "Closed", group: "Active" },
  ],
};
const amountColumn: NumberColumn<Row> = { id: "amount", type: "number", header: "Amount" };
const paidColumn: BooleanColumn<Row> = { id: "paid", type: "boolean", header: "Paid" };

const DE: Partial<FilterLabels> = {
  filterAriaLabel: (header) => `${header} filtern`,
  selectAll: "Alle auswählen",
  searchPlaceholder: () => "Suchen…",
  selectAllOfGroup: (group) => `Alle in ${group} auswählen`,
  minPlaceholder: "Von",
  maxPlaceholder: "Bis",
  rangeSeparator: "bis",
  booleanAll: "Alle",
};

describe("defaultFilterLabels", () => {
  it("keeps today's English strings", () => {
    expect(defaultFilterLabels.selectAll).toBe("Select all");
    expect(defaultFilterLabels.searchPlaceholder("Status")).toBe("Search status...");
    expect(defaultFilterLabels.filterAriaLabel("Status")).toBe("Filter Status");
    expect(defaultFilterLabels.stringPlaceholder("Name")).toBe("Filter name...");
    expect(defaultFilterLabels.minimumAriaLabel("Amount")).toBe("Amount minimum");
  });

  it("ignores explicitly-undefined overrides when merging", () => {
    expect(mergeFilterLabels(defaultFilterLabels, { selectAll: undefined }).selectAll).toBe("Select all");
  });

  it("renders the English defaults with no labels supplied", async () => {
    render(<EnumFilter column={statusColumn} value={undefined} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Filter Status" }));
    expect(screen.getByPlaceholderText("Search status...")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all of Active" })).toBeInTheDocument();
  });
});

describe("per-widget labels prop", () => {
  it("renders overridden EnumFilter labels", async () => {
    render(<EnumFilter column={statusColumn} value={undefined} onChange={vi.fn()} labels={DE} />);
    await userEvent.click(screen.getByRole("button", { name: "Status filtern" }));
    expect(screen.getByPlaceholderText("Suchen…")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Alle auswählen" })).toBeInTheDocument();
    expect(screen.getByText("Alle auswählen")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Alle in Active auswählen" })).toBeInTheDocument();
  });

  it("renders overridden NumberRangeFilter placeholders, keeping un-overridden defaults", () => {
    render(<NumberRangeFilter column={amountColumn} value={undefined} onChange={vi.fn()} bare labels={DE} />);
    expect(screen.getByPlaceholderText("Von")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Bis")).toBeInTheDocument();
    expect(screen.getByText("bis")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount minimum")).toBeInTheDocument();
  });

  it("merges the widget prop over a FilterLabelsProvider", () => {
    render(
      <FilterLabelsProvider labels={DE}>
        <BooleanFilter column={paidColumn} value={undefined} onChange={vi.fn()} bare labels={{ booleanAll: "Beide" }} />
      </FilterLabelsProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Paid filter" })).toHaveTextContent("Beide");
  });
});

describe("<DataGrid filterLabels>", () => {
  const columns: ColumnDef<Row>[] = [
    { ...statusColumn, accessorKey: "status", filterable: true },
    { ...amountColumn, accessorKey: "amount", filterable: true },
  ];
  const data: Row[] = [{ id: "1", status: "open", amount: 5, paid: true }];

  it("uses English defaults when unset", async () => {
    render(<DataGrid columns={columns} dataSource={{ mode: "client", data }} getRowId={(row) => row.id} />);
    expect(screen.getByTestId("filter-trigger-status")).toHaveAccessibleName("Filter Status");
    await userEvent.click(screen.getByTestId("filter-trigger-status"));
    expect(screen.getByPlaceholderText("Search status...")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeInTheDocument();
  });

  it("delivers overridden labels to the header trigger and the default widgets", async () => {
    render(
      <DataGrid
        columns={columns}
        dataSource={{ mode: "client", data }}
        getRowId={(row) => row.id}
        filterLabels={DE}
      />,
    );
    expect(screen.getByTestId("filter-trigger-status")).toHaveAccessibleName("Status filtern");

    await userEvent.click(screen.getByTestId("filter-trigger-status"));
    expect(screen.getByPlaceholderText("Suchen…")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Alle auswählen" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    await userEvent.click(screen.getByTestId("filter-trigger-amount"));
    expect(screen.getByPlaceholderText("Von")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Bis")).toBeInTheDocument();
  });

  it("reaches a column's custom renderFilter widget via context", async () => {
    const custom: ColumnDef<Row>[] = [
      {
        ...amountColumn,
        accessorKey: "amount",
        filterable: true,
        renderFilter: (value, onChange) => <NumberRangeFilter column={amountColumn} value={value} onChange={onChange} bare />,
      },
    ];
    render(
      <DataGrid columns={custom} dataSource={{ mode: "client", data }} getRowId={(row) => row.id} filterLabels={DE} />,
    );
    await userEvent.click(screen.getByTestId("filter-trigger-amount"));
    expect(screen.getByPlaceholderText("Von")).toBeInTheDocument();
  });
});
