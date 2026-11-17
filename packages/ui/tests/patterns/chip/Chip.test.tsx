import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Chip } from "../../../src/patterns/chip/Chip";

describe("Chip", () => {
  it("renders static text without a role", () => {
    render(<Chip>Brand</Chip>);
    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("is a toggle with aria-pressed when onClick is given", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Chip onClick={onClick}>Charts</Chip>);
    const button = screen.getByRole("button", { name: "Charts" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<Chip selected onClick={onClick}>Charts</Chip>);
    expect(screen.getByRole("button", { name: "Charts" })).toHaveAttribute("aria-pressed", "true");
  });

  it("removes via the x button and via Backspace/Delete on the focused chip", () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Zurich</Chip>);
    fireEvent.click(screen.getByRole("button", { name: "Remove Zurich" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    const chip = screen.getByText("Zurich").parentElement as HTMLElement;
    chip.focus();
    fireEvent.keyDown(chip, { key: "Backspace" });
    fireEvent.keyDown(chip, { key: "Delete" });
    expect(onRemove).toHaveBeenCalledTimes(3);
  });

  it("uses removeLabel and labels", () => {
    render(<Chip onRemove={() => {}} labels={{ remove: "Entfernen" }}>A</Chip>);
    expect(screen.getByRole("button", { name: "Entfernen A" })).toBeInTheDocument();
    render(<Chip onRemove={() => {}} removeLabel="Clear it">B</Chip>);
    expect(screen.getByRole("button", { name: "Clear it" })).toBeInTheDocument();
  });

  it("does not remove when disabled", () => {
    const onRemove = vi.fn();
    render(<Chip disabled onRemove={onRemove}>X</Chip>);
    fireEvent.keyDown(screen.getByText("X").parentElement as HTMLElement, { key: "Backspace" });
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("applies dashed, size and the pill token", () => {
    render(<Chip dashed size="sm" data-testid="c">x</Chip>);
    const el = screen.getByTestId("c");
    expect(el.className).toContain("border-dashed");
    expect(el.className).toContain("h-5");
    expect(el.className).toContain("--radius-pill");
  });
});
