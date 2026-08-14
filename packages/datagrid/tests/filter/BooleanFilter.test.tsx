import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BooleanColumn } from "../../src/column/types";
import { BooleanFilter } from "../../src/filter/BooleanFilter";
import { ControlledFilter } from "./harness";

interface Row {
  active: boolean;
}

const column: BooleanColumn<Row> = { id: "active", type: "boolean", header: "Active" };

describe("BooleanFilter: trigger summary", () => {
  it("shows an icon-only trigger with no visible text when unfiltered", () => {
    render(<BooleanFilter column={column} value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Filter Active" })).toHaveTextContent("");
  });

  it("shows Yes/No on the trigger once filtered", () => {
    render(
      <BooleanFilter column={column} value={{ field: "active", operator: "eq", value: true }} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Filter Active" })).toHaveTextContent("Yes");
  });
});

describe("BooleanFilter", () => {
  it("defaults to All (no filter)", () => {
    render(<BooleanFilter column={column} value={undefined} onChange={vi.fn()} bare />);
    expect(screen.getByRole("combobox")).toHaveTextContent("All");
  });

  it("emits eq=true when Yes is selected", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledFilter<BooleanColumn<Row>> Widget={BooleanFilter} column={column} onChangeSpy={onChangeSpy} />);

    await userEvent.click(screen.getByRole("button", { name: "Filter Active" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Active filter" }));
    await userEvent.click(await screen.findByRole("option", { name: "Yes" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "active", operator: "eq", value: true });
  });

  it("emits eq=false when No is selected", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledFilter<BooleanColumn<Row>> Widget={BooleanFilter} column={column} onChangeSpy={onChangeSpy} />);

    await userEvent.click(screen.getByRole("button", { name: "Filter Active" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Active filter" }));
    await userEvent.click(await screen.findByRole("option", { name: "No" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "active",
      operator: "eq",
      value: false,
    });
  });

  it("displays a foreign `neq` filter inverted (neq=true means No, not Yes)", () => {
    render(
      <BooleanFilter
        column={column}
        value={{ field: "active", operator: "neq", value: true }}
        onChange={vi.fn()}
        bare
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("No");
  });

  it("clears the filter when switching back to All", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<BooleanColumn<Row>>
        Widget={BooleanFilter}
        column={column}
        initial={{ field: "active", operator: "eq", value: true }}
        onChangeSpy={onChangeSpy}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Active" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Active filter" }));
    await userEvent.click(await screen.findByRole("option", { name: "All" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);
  });

  describe("bare (no own Popover/trigger — for a caller-provided popover)", () => {
    it("renders the select directly, with no trigger button to open", () => {
      render(<BooleanFilter column={column} value={undefined} onChange={vi.fn()} bare />);
      expect(screen.queryByRole("button", { name: "Filter Active" })).not.toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: "Active filter" })).toBeInTheDocument();
    });
  });
});
