import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { StringColumn } from "../../src/column/types";
import { StringFilter } from "../../src/filter/StringFilter";
import { ControlledFilter } from "./harness";

interface Row {
  name: string;
}

const column: StringColumn<Row> = { id: "name", type: "string", header: "Name" };

describe("StringFilter: trigger summary", () => {
  it("shows an icon-only trigger with no visible text when unfiltered", () => {
    render(<StringFilter column={column} value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Filter Name" })).toHaveTextContent("");
  });

  it("shows the typed text on the trigger once filtered", () => {
    render(
      <StringFilter
        column={column}
        value={{ field: "name", operator: "contains", value: "acme" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Filter Name" })).toHaveTextContent("acme");
  });
});

describe("StringFilter", () => {
  it("emits a contains filter as the user types", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledFilter<StringColumn<Row>> Widget={StringFilter} column={column} onChangeSpy={onChangeSpy} />);

    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    const input = screen.getByPlaceholderText("Filter name...");
    await userEvent.type(input, "acme");

    expect(input).toHaveValue("acme");
    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "name",
      operator: "contains",
      value: "acme",
    });
  });

  it("clears the filter when the text is emptied", async () => {
    const onChange = vi.fn();
    render(
      <StringFilter
        column={column}
        value={{ field: "name", operator: "contains", value: "acme" }}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    const input = screen.getByDisplayValue("acme");
    await userEvent.clear(input);

    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("switches operator via the dropdown while preserving the current text", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<StringColumn<Row>>
        Widget={StringFilter}
        column={column}
        initial={{ field: "name", operator: "contains", value: "acme" }}
        onChangeSpy={onChangeSpy}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Name filter operator" }));
    await userEvent.click(await screen.findByRole("option", { name: "Starts with" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "name",
      operator: "startsWith",
      value: "acme",
    });
  });

  it("keeps a non-default operator picked before any text is typed, instead of silently reverting to Contains", async () => {
    // Regression: emit() intentionally clears the filter entirely
    // (onChange(undefined)) whenever the text is empty, since an operator with
    // no value isn't a filter yet -- but naively deriving the *displayed*
    // operator from `value?.operator` meant that clearing left nothing for the
    // just-picked operator to persist in, so the very next keystroke silently
    // fell back to the "contains" default. A user picking "Is" before typing
    // anything (a natural "choose how to search, then type" flow) must not
    // lose that choice.
    const onChangeSpy = vi.fn();
    render(<ControlledFilter<StringColumn<Row>> Widget={StringFilter} column={column} onChangeSpy={onChangeSpy} />);

    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Name filter operator" }));
    await userEvent.click(await screen.findByRole("option", { name: "Is" }));

    // No filter exists yet (empty text), so onChange(undefined) is expected here --
    // the bug isn't in this call, it's in what the *next* keystroke does with it.
    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);

    const input = screen.getByPlaceholderText("Filter name...");
    await userEvent.type(input, "acme");

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "name",
      operator: "eq",
      value: "acme",
    });
  });

  it("resyncs the displayed operator when the filter is cleared from outside this widget", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <StringFilter
        column={column}
        value={{ field: "name", operator: "eq", value: "acme" }}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    expect(screen.getByRole("combobox", { name: "Name filter operator" })).toHaveTextContent("Is");

    // Simulates a "reset filters" action clearing this column's value externally,
    // with the widget never unmounting.
    rerender(<StringFilter column={column} value={undefined} onChange={onChange} />);
    expect(screen.getByRole("combobox", { name: "Name filter operator" })).toHaveTextContent("Contains");
  });

  describe("bare (no own Popover/trigger — for a caller-provided popover)", () => {
    it("renders the operator select and input directly, with no trigger button to open", () => {
      render(<StringFilter column={column} value={undefined} onChange={vi.fn()} bare />);
      expect(screen.queryByRole("button", { name: "Filter Name" })).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Filter name...")).toBeInTheDocument();
    });
  });
});
