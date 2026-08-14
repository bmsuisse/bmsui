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

  describe("bare (no own Popover/trigger — for a caller-provided popover)", () => {
    it("renders the operator select and input directly, with no trigger button to open", () => {
      render(<StringFilter column={column} value={undefined} onChange={vi.fn()} bare />);
      expect(screen.queryByRole("button", { name: "Filter Name" })).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Filter name...")).toBeInTheDocument();
    });
  });
});
