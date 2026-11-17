import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Reasoning } from "../../../src/patterns/reasoning/Reasoning";

describe("Reasoning", () => {
  it("is folded at rest with the duration label", () => {
    render(<Reasoning duration={4}>because</Reasoning>);
    const trigger = screen.getByRole("button", { name: "Thought for 4 s" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("is open and busy while streaming", () => {
    render(<Reasoning streaming>so far</Reasoning>);
    expect(screen.getByRole("button", { name: "Thinking…" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("so far").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
  });

  it("folds again when streaming ends, unless the reader toggled", () => {
    const { rerender } = render(<Reasoning streaming>x</Reasoning>);
    rerender(<Reasoning duration={2}>x</Reasoning>);
    expect(screen.getByRole("button", { name: "Thought for 2 s" })).toHaveAttribute("aria-expanded", "false");
  });

  it("honours defaultOpen, labels and onOpenChange", () => {
    const onOpenChange = vi.fn();
    render(
      <Reasoning defaultOpen onOpenChange={onOpenChange} labels={{ thought: "Überlegung" }}>
        x
      </Reasoning>,
    );
    const trigger = screen.getByRole("button", { name: "Überlegung" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("makes the scrolling text a focusable labelled region only while open", () => {
    const { rerender } = render(<Reasoning streaming>so far</Reasoning>);
    const region = screen.getByText("so far").closest("[role=region]");
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveAttribute("aria-label", "Thinking…");
    rerender(<Reasoning duration={2}>so far</Reasoning>);
    expect(screen.getByText("so far").closest("[role=region]")).toHaveAttribute("tabindex", "-1");
  });
});
