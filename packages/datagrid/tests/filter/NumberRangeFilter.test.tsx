import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { NumberColumn } from "../../src/column/types";
import { NumberRangeFilter } from "../../src/filter/NumberRangeFilter";
import type { FilterDescriptor } from "../../src/filter/types";
import { ControlledFilter } from "./harness";

interface Row {
  amount: number;
}

const column: NumberColumn<Row> = { id: "amount", type: "number", header: "Amount" };

describe("NumberRangeFilter: trigger summary", () => {
  it("shows an icon-only trigger with no visible text when unfiltered", () => {
    render(<NumberRangeFilter column={column} value={undefined} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Filter Amount" });
    expect(trigger).toHaveTextContent("");
  });

  it("shows the range summary on the trigger once filtered", () => {
    render(
      <NumberRangeFilter
        column={column}
        value={{ field: "amount", operator: "between", value: [10, 99] }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Filter Amount" })).toHaveTextContent("10 – 99");
  });
});

describe("NumberRangeFilter", () => {
  it("emits gte when only the min is set", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>> Widget={NumberRangeFilter} column={column} onChangeSpy={onChangeSpy} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Amount" }));
    await userEvent.type(screen.getByLabelText("Amount minimum"), "10");

    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "amount", operator: "gte", value: 10 });
  });

  it("emits lte when only the max is set", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>> Widget={NumberRangeFilter} column={column} onChangeSpy={onChangeSpy} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Amount" }));
    await userEvent.type(screen.getByLabelText("Amount maximum"), "99");

    expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "amount", operator: "lte", value: 99 });
  });

  it("emits between when both min and max are set", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>> Widget={NumberRangeFilter} column={column} onChangeSpy={onChangeSpy} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Amount" }));
    await userEvent.type(screen.getByLabelText("Amount minimum"), "10");
    await userEvent.type(screen.getByLabelText("Amount maximum"), "99");

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "amount",
      operator: "between",
      value: [10, 99],
    });
  });

  it("reorders an inverted min/max into a satisfiable between range", async () => {
    // If the user types a larger value into Min than Max, emitting them
    // as-typed would produce a `between` with lower > upper — which
    // evaluateFilter/sql.py/meili.py would all (correctly, but silently)
    // treat as matching zero rows.
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>> Widget={NumberRangeFilter} column={column} onChangeSpy={onChangeSpy} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Amount" }));
    await userEvent.type(screen.getByLabelText("Amount minimum"), "99");
    await userEvent.type(screen.getByLabelText("Amount maximum"), "10");

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "amount",
      operator: "between",
      value: [10, 99],
    });
  });

  it("clears the filter when both bounds are emptied", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<NumberColumn<Row>>
        Widget={NumberRangeFilter}
        column={column}
        initial={{ field: "amount", operator: "gte", value: 10 }}
        onChangeSpy={onChangeSpy}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Amount" }));
    await userEvent.clear(screen.getByLabelText("Amount minimum"));

    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);
  });

  it("resyncs its displayed min/max when `value` is cleared externally (not via its own onChange)", async () => {
    // Regression test: the widget keeps local text state to avoid the
    // swap-corruption bug (see descriptorFor's comment), which means it
    // must explicitly resync from an externally-driven change — e.g. a
    // "Clear all filters" toolbar action that calls setColumnFilter(id,
    // undefined) directly, bypassing this widget's own onChange entirely.
    // Rendered `bare` since this test is about the resync effect, not the
    // trigger/popover chrome around it.
    function ExternalResetHarness(): ReactElement {
      const [value, setValue] = useState<FilterDescriptor | undefined>({
        field: "amount",
        operator: "between",
        value: [10, 99],
      });
      return (
        <div>
          <button type="button" onClick={() => setValue(undefined)}>
            Clear externally
          </button>
          <NumberRangeFilter column={column} value={value} onChange={setValue} bare />
        </div>
      );
    }

    render(<ExternalResetHarness />);

    expect(screen.getByLabelText("Amount minimum")).toHaveValue(10);
    expect(screen.getByLabelText("Amount maximum")).toHaveValue(99);

    await userEvent.click(screen.getByRole("button", { name: "Clear externally" }));

    expect(screen.getByLabelText("Amount minimum")).toHaveValue(null);
    expect(screen.getByLabelText("Amount maximum")).toHaveValue(null);
  });

  it("resyncs its displayed min/max when `value` changes to a different externally-set filter", async () => {
    // Regression test: an earlier version of the resync effect only handled
    // `value` becoming undefined; loading a different saved filter (still
    // defined, just a different range) left the boxes showing stale text
    // even though the grid was now filtering by the new range.
    function ExternalReplaceHarness(): ReactElement {
      const [value, setValue] = useState<FilterDescriptor | undefined>({
        field: "amount",
        operator: "between",
        value: [10, 99],
      });
      return (
        <div>
          <button
            type="button"
            onClick={() => setValue({ field: "amount", operator: "gte", value: 500 })}
          >
            Load saved view
          </button>
          <NumberRangeFilter column={column} value={value} onChange={setValue} bare />
        </div>
      );
    }

    render(<ExternalReplaceHarness />);

    expect(screen.getByLabelText("Amount minimum")).toHaveValue(10);
    expect(screen.getByLabelText("Amount maximum")).toHaveValue(99);

    await userEvent.click(screen.getByRole("button", { name: "Load saved view" }));

    expect(screen.getByLabelText("Amount minimum")).toHaveValue(500);
    expect(screen.getByLabelText("Amount maximum")).toHaveValue(null);
  });
});
