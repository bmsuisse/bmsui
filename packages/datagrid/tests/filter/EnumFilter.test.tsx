import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { EnumColumn } from "../../src/column/types";
import { EnumFilter } from "../../src/filter/EnumFilter";
import { ControlledFilter } from "./harness";

interface Row {
  status: string;
}

const column: EnumColumn<Row> = {
  id: "status",
  type: "enum",
  header: "Status",
  options: [
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
    { value: "pending", label: "Pending" },
  ],
};

/** A longer option list, to confirm the checkbox list is the only code path regardless of option count. */
const longColumn: EnumColumn<Row> = {
  id: "status",
  type: "enum",
  header: "Status",
  options: Array.from({ length: 20 }, (_, i) => ({ value: `v${i}`, label: `Value ${i}` })),
};

describe("EnumFilter: trigger summary", () => {
  it("shows an icon-only trigger with no visible text when unfiltered", () => {
    render(<EnumFilter column={column} value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Filter Status" })).toHaveTextContent("");
  });

  it("shows a count once options are selected", () => {
    render(
      <EnumFilter
        column={column}
        value={{ field: "status", operator: "in", value: ["open", "closed"] }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("2 selected");
  });
});

describe("EnumFilter: per-item checkbox toggle", () => {
  it("selects an option and emits an `in` filter", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledFilter<EnumColumn<Row>> Widget={EnumFilter} column={column} onChangeSpy={onChangeSpy} />);

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("checkbox", { name: "Open" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "status",
      operator: "in",
      value: ["open"],
    });
  });

  it("accumulates multiple selections", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<EnumColumn<Row>>
        Widget={EnumFilter}
        column={column}
        initial={{ field: "status", operator: "in", value: ["open"] }}
        onChangeSpy={onChangeSpy}
      />,
    );

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("checkbox", { name: "Closed" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "status",
      operator: "in",
      value: ["open", "closed"],
    });
  });

  it("clears the filter when the only selected option is toggled off", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<EnumColumn<Row>>
        Widget={EnumFilter}
        column={column}
        initial={{ field: "status", operator: "in", value: ["open"] }}
        onChangeSpy={onChangeSpy}
      />,
    );

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("checkbox", { name: "Open" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);
  });

  it("renders as plain checkboxes, not menu items", async () => {
    render(<EnumFilter column={column} value={undefined} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));

    expect(screen.queryByRole("menuitemcheckbox")).not.toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
  });

  it("supports keyboard toggling: tab to a checkbox, then space toggles it", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledFilter<EnumColumn<Row>> Widget={EnumFilter} column={column} onChangeSpy={onChangeSpy} />);

    await userEvent.click(screen.getByRole("button"));
    const search = screen.getByPlaceholderText("Search status...");
    const selectAll = screen.getByRole("checkbox", { name: "Select all" });
    const openCheckbox = screen.getByRole("checkbox", { name: "Open" });

    search.focus();
    await userEvent.tab(); // -> Select all
    expect(selectAll).toHaveFocus();
    await userEvent.tab(); // -> Open
    expect(openCheckbox).toHaveFocus();
    await userEvent.keyboard(" ");

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "status",
      operator: "in",
      value: ["open"],
    });
  });
});

describe("EnumFilter: search filters the rendered list", () => {
  it("only renders options whose label matches the search term", async () => {
    render(<EnumFilter column={longColumn} value={undefined} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button"));
    const search = await screen.findByPlaceholderText("Search status...");
    await userEvent.type(search, "Value 3");

    expect(screen.getByText("Value 3")).toBeInTheDocument();
    expect(screen.queryByText("Value 1")).not.toBeInTheDocument();
  });

  it("does not touch the committed filter just by typing a search term", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledFilter<EnumColumn<Row>> Widget={EnumFilter} column={column} onChangeSpy={onChangeSpy} />);

    await userEvent.click(screen.getByRole("button"));
    const search = screen.getByPlaceholderText("Search status...");
    await userEvent.type(search, "Open");

    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it("shows a 'No matches' message when the search matches nothing", async () => {
    render(<EnumFilter column={column} value={undefined} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button"));
    const search = screen.getByPlaceholderText("Search status...");
    await userEvent.type(search, "zzz");

    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });
});

describe("EnumFilter: 'Select all' is tri-state and scoped to the filtered subset", () => {
  it("is checked when every option is selected and there is no search term", async () => {
    render(
      <EnumFilter
        column={column}
        value={{ field: "status", operator: "in", value: ["open", "closed", "pending"] }}
        onChange={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeChecked();
  });

  it("is indeterminate when only some options are selected", async () => {
    render(
      <EnumFilter
        column={column}
        value={{ field: "status", operator: "in", value: ["open"] }}
        onChange={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button"));

    const selectAll = screen.getByRole("checkbox", { name: "Select all" });
    expect(selectAll).not.toBeChecked();
    expect(selectAll).toBePartiallyChecked();
  });

  it("selecting all while a search term is active only selects the visible subset", async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledFilter<EnumColumn<Row>> Widget={EnumFilter} column={column} onChangeSpy={onChangeSpy} />);

    await userEvent.click(screen.getByRole("button"));
    const search = screen.getByPlaceholderText("Search status...");
    await userEvent.type(search, "o"); // matches "Open" and "Closed", not "Pending"

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "status",
      operator: "in",
      value: ["open", "closed"],
    });
  });

  it("checked with a search term active is scoped to the visible subset, not the full option set", async () => {
    // "closed" is selected but hidden by the search term "open" — the
    // visible subset ("Open") is not fully selected, so this must read as
    // unchecked/indeterminate, not checked, even though the full option set
    // includes a selection.
    render(
      <EnumFilter
        column={column}
        value={{ field: "status", operator: "in", value: ["closed"] }}
        onChange={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    const search = screen.getByPlaceholderText("Search status...");
    await userEvent.type(search, "open");

    expect(screen.getByRole("checkbox", { name: "Select all" })).not.toBeChecked();
  });

  it("deselecting all while a search term is active only deselects the visible subset", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ControlledFilter<EnumColumn<Row>>
        Widget={EnumFilter}
        column={column}
        initial={{ field: "status", operator: "in", value: ["open", "closed", "pending"] }}
        onChangeSpy={onChangeSpy}
      />,
    );

    await userEvent.click(screen.getByRole("button"));
    const search = screen.getByPlaceholderText("Search status...");
    await userEvent.type(search, "pending");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select all" }));

    expect(onChangeSpy).toHaveBeenLastCalledWith({
      field: "status",
      operator: "in",
      value: ["open", "closed"],
    });
  });

  it("is disabled when the search term matches no options", async () => {
    render(<EnumFilter column={column} value={undefined} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button"));
    const search = screen.getByPlaceholderText("Search status...");
    await userEvent.type(search, "zzz");

    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeDisabled();
  });

  describe("bare (no own Label/Popover/trigger — for a caller-provided popover)", () => {
    it("renders the search input and option list directly, with no trigger button or Label to open", () => {
      render(<EnumFilter column={column} value={undefined} onChange={vi.fn()} bare />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByText("Status", { selector: "label" })).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search status...")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("still emits filter changes from an option checkbox with no popover to open first", async () => {
      const onChangeSpy = vi.fn();
      render(<EnumFilter column={column} value={undefined} onChange={onChangeSpy} bare />);
      await userEvent.click(screen.getByText("Open"));
      expect(onChangeSpy).toHaveBeenLastCalledWith({ field: "status", operator: "in", value: ["open"] });
    });
  });
});
