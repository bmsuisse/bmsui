import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "../../../src/patterns/segmented-control/SegmentedControl";

const options = [
  { value: "list", label: "List" },
  { value: "board", label: "Board", disabled: true },
  { value: "table", label: "Table" },
];

const Controlled = ({ onChange = () => {} }: { onChange?: (v: string) => void }) => {
  const [v, setV] = useState("list");
  return (
    <SegmentedControl
      aria-label="View"
      data-testid="view"
      options={options}
      value={v}
      onValueChange={(next) => {
        setV(next);
        onChange(next);
      }}
    />
  );
};

describe("SegmentedControl", () => {
  it("renders a radiogroup with one tab stop on the checked option", () => {
    render(<Controlled />);
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument();
    const list = screen.getByRole("radio", { name: "List" });
    expect(list).toHaveAttribute("aria-checked", "true");
    expect(list).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Table" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByTestId("view-option-table")).toBeInTheDocument();
  });

  it("selects on click", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    expect(onChange).toHaveBeenCalledWith("table");
    expect(screen.getByRole("radio", { name: "Table" })).toHaveAttribute("aria-checked", "true");
  });

  it("arrow keys move and select, skipping disabled options and wrapping", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const list = screen.getByRole("radio", { name: "List" });
    list.focus();
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("table");
    expect(screen.getByRole("radio", { name: "Table" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("radio", { name: "Table" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("list");
    fireEvent.keyDown(list, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("table");
  });

  it("disables every option when disabled", () => {
    render(<SegmentedControl options={options} value="list" onValueChange={() => {}} disabled />);
    screen.getAllByRole("radio").forEach((radio) => expect(radio).toBeDisabled());
  });
});

describe("SegmentedControl without a matching value", () => {
  it("ArrowLeft goes to the last enabled option, ArrowRight to the first", () => {
    const onChange = vi.fn();
    render(<SegmentedControl aria-label="View" options={options} value="" onValueChange={onChange} />);
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("table");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("list");
  });
});
