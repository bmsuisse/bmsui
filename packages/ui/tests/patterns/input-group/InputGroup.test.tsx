import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../../../src/patterns/input-group/InputGroup";

describe("InputGroup", () => {
  it("renders addons around the input and focuses the input when an addon is clicked", () => {
    render(
      <InputGroup>
        <InputGroupAddon>CHF</InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
        <InputGroupAddon>/ month</InputGroupAddon>
      </InputGroup>,
    );
    const input = screen.getByLabelText("Amount");
    fireEvent.click(screen.getByText("CHF"));
    expect(input).toHaveFocus();
    expect(screen.getByTestId("input-group")).toHaveAttribute("role", "group");
  });

  it("buttons are type=button ghost buttons and don't steal the addon focus behaviour", () => {
    const onClick = vi.fn();
    render(
      <form onSubmit={() => onClick("submit")}>
        <InputGroup size="sm" data-testid="g">
          <InputGroupInput aria-label="Url" />
          <InputGroupButton aria-label="Copy" onClick={() => onClick("copy")} />
        </InputGroup>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Copy" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith("copy");
    expect(onClick).not.toHaveBeenCalledWith("submit");
    expect(screen.getByLabelText("Url")).not.toHaveFocus();
    expect(screen.getByTestId("g")).toHaveAttribute("data-size", "sm");
  });

  it("forwards the input ref", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(
      <InputGroup>
        <InputGroupInput ref={ref} />
      </InputGroup>,
    );
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
