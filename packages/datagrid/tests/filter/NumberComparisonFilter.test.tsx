import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { NumberColumn } from "../../src/column/types";
import { NumberComparisonFilter } from "../../src/filter/NumberComparisonFilter";
import { ControlledFilter } from "./harness";

interface Row {
  stock: number;
}

const column: NumberColumn<Row> = { id: "stock", type: "number", header: "Stock" };

describe("NumberComparisonFilter: bare defaults to true (no own Popover/trigger)", () => {
  it("renders the operator select and input directly when bare is unset — no trigger button to open first", () => {
    render(<NumberComparisonFilter column={column} value={undefined} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Filter Stock" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Stock filter operator" })).toBeInTheDocument();
  });

  it("still emits a filter change with no popover to open first", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledFilter<NumberColumn<Row>> Widget={NumberComparisonFilter} column={column} onChangeSpy={onChangeSpy} />);

    await userEvent.type(screen.getByLabelText("Stock", { exact: true }), "5");

    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "stock", operator: "gt", value: 5 });
  });
});

describe("NumberComparisonFilter: bare={false} trigger summary (own Popover/trigger — for filterDisplay: 'row')", () => {
  it("shows an icon-only trigger with no visible text when unfiltered", () => {
    render(<NumberComparisonFilter column={column} value={undefined} onChange={vi.fn()} bare={false} />);
    expect(screen.getByRole("button", { name: "Filter Stock" })).toHaveTextContent("");
  });

  it("shows the operator symbol and value on the trigger once filtered", () => {
    render(
      <NumberComparisonFilter
        column={column}
        value={{ field: "stock", operator: "lt", value: 10 }}
        onChange={vi.fn()}
        bare={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Filter Stock" })).toHaveTextContent("< 10");
  });

  it("shows a range summary on the trigger for Between", () => {
    render(
      <NumberComparisonFilter
        column={column}
        value={{ field: "stock", operator: "between", value: [10, 50] }}
        onChange={vi.fn()}
        bare={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Filter Stock" })).toHaveTextContent("10 – 50");
  });
});

describe("NumberComparisonFilter: bare={false} (own Popover/trigger — for filterDisplay: 'row')", () => {
  it("defaults to Greater than and emits gt once a value is typed", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>, { bare?: boolean }>
        Widget={NumberComparisonFilter}
        column={column}
        onChangeSpy={onChangeSpy}
        extraProps={{ bare: false }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Stock" }));
    await userEvent.type(screen.getByLabelText("Stock", { exact: true }), "10");

    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "stock", operator: "gt", value: 10 });
  });

  it("switches operator via the dropdown while preserving the typed value", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>, { bare?: boolean }>
        Widget={NumberComparisonFilter}
        column={column}
        initial={{ field: "stock", operator: "gt", value: 10 }}
        onChangeSpy={onChangeSpy}
        extraProps={{ bare: false }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Stock" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Stock filter operator" }));
    await userEvent.click(await screen.findByRole("option", { name: "Less than" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "stock", operator: "lt", value: 10 });
  });

  it("switching to Between clears the filter until a second bound is typed", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>, { bare?: boolean }>
        Widget={NumberComparisonFilter}
        column={column}
        initial={{ field: "stock", operator: "gt", value: 10 }}
        onChangeSpy={onChangeSpy}
        extraProps={{ bare: false }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Stock" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Stock filter operator" }));
    await userEvent.click(await screen.findByRole("option", { name: "Between" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByLabelText("Stock minimum")).toHaveValue(10);

    await userEvent.type(screen.getByLabelText("Stock maximum"), "50");

    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "stock", operator: "between", value: [10, 50] });
  });

  it("clears the filter when the value is emptied", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>, { bare?: boolean }>
        Widget={NumberComparisonFilter}
        column={column}
        initial={{ field: "stock", operator: "gt", value: 10 }}
        onChangeSpy={onChangeSpy}
        extraProps={{ bare: false }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Stock" }));
    await userEvent.clear(screen.getByLabelText("Stock", { exact: true }));

    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);
  });
});
