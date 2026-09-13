import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScrollToBottomButton } from "../../../src/patterns/chat/ScrollToBottomButton";

describe("ScrollToBottomButton", () => {
  it("is visible (not disabled) by default", () => {
    render(<ScrollToBottomButton />);
    expect(screen.getByRole("button", { name: "New messages" })).not.toBeDisabled();
  });

  it("visible={false} disables the button but keeps it in the DOM", () => {
    render(<ScrollToBottomButton visible={false} />);
    const button = screen.getByRole("button", { hidden: true });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:invisible");
  });

  it("uses label as the aria-label", () => {
    render(<ScrollToBottomButton label="Jump to latest" />);
    expect(screen.getByRole("button", { name: "Jump to latest" })).toBeInTheDocument();
  });

  it("fires onClick when visible", () => {
    const onClick = vi.fn();
    render(<ScrollToBottomButton onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
