import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "../../src/column/types";
import { ActiveFilterBar } from "../../src/filter/ActiveFilterBar";
import type { CompositeFilterDescriptor, FilterDescriptor } from "../../src/filter/types";

interface Row {
  status: string;
  amount: number;
  paid: boolean;
  name: string;
}

const columns: ColumnDef<Row>[] = [
  {
    id: "status",
    type: "enum",
    header: "Status",
    accessorKey: "status",
    options: [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
    ],
  },
  { id: "amount", type: "number", header: "Amount", accessorKey: "amount" },
  { id: "paid", type: "boolean", header: "Paid", accessorKey: "paid" },
  { id: "name", type: "string", header: "Name", accessorKey: "name" },
];

const leaves: FilterDescriptor[] = [
  { field: "status", operator: "in", value: ["open", "closed"] },
  { field: "amount", operator: "between", value: [10, 20] },
  { field: "paid", operator: "eq", value: true },
  { field: "name", operator: "contains", value: "ac" },
];
const filter: CompositeFilterDescriptor = { logic: "and", filters: leaves };

describe("ActiveFilterBar", () => {
  it("renders the strip with a hint when nothing is filtered", () => {
    render(<ActiveFilterBar filter={null} columns={columns} onFilterChange={vi.fn()} />);
    expect(screen.getByTestId("active-filter-bar")).toHaveTextContent("No filters");
    expect(screen.getByText("Clear all filters")).toBeDisabled();
  });

  it("shows maxChips chips with readable text, the rest behind +N more", async () => {
    render(<ActiveFilterBar filter={filter} columns={columns} onFilterChange={vi.fn()} maxChips={3} />);
    expect(screen.getByText("Filters (4):")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-status")).toHaveTextContent("Status is any of Open, Closed");
    expect(screen.getByTestId("filter-chip-amount")).toHaveTextContent("Amount between 10 – 20");
    expect(screen.getByTestId("filter-chip-paid")).toHaveTextContent("Paid is Yes");
    expect(screen.queryByTestId("filter-chip-name")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "+1 more" }));
    expect(await screen.findByTestId("filter-chip-name")).toHaveTextContent("Name contains ac");
  });

  it("removes one filter, and clears all", async () => {
    const onFilterChange = vi.fn();
    render(<ActiveFilterBar filter={filter} columns={columns} onFilterChange={onFilterChange} maxChips={5} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove filter Amount between 10 – 20" }));
    expect(onFilterChange).toHaveBeenLastCalledWith({
      logic: "and",
      filters: leaves.filter((leaf) => leaf.field !== "amount"),
    });
    await userEvent.click(screen.getByText("Clear all filters"));
    expect(onFilterChange).toHaveBeenLastCalledWith(null);
  });

  it("takes translated operator words", () => {
    render(
      <ActiveFilterBar
        filter={{ logic: "and", filters: [{ field: "name", operator: "contains", value: "x" }] }}
        columns={columns}
        onFilterChange={vi.fn()}
        labels={{ operatorLabel: (op) => (op === "contains" ? "enthält" : op) }}
      />,
    );
    expect(screen.getByTestId("filter-chip-name")).toHaveTextContent("Name enthält x");
  });
});
