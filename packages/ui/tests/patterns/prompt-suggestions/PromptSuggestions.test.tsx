import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PromptSuggestions } from "../../../src/patterns/prompt-suggestions/PromptSuggestions";

describe("PromptSuggestions", () => {
  it("lets chips wrap their text in wrap mode", () => {
    render(<PromptSuggestions wrap suggestions={["One"]} />);
    const chip = screen.getByRole("button", { name: "One" });
    expect(chip).toHaveClass("whitespace-normal", "max-w-full");
    expect(chip).not.toHaveClass("whitespace-nowrap");
  });

  it("renders strings as buttons and selects them", async () => {
    const onSelect = vi.fn();
    render(<PromptSuggestions suggestions={["One", "Two"]} onSelect={onSelect} aria-label="Ideas" />);
    expect(screen.getByRole("group", { name: "Ideas" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Two" }));
    expect(onSelect).toHaveBeenCalledWith("Two", { id: "Two", label: "Two" });
  });

  it("passes the prompt of an object item", async () => {
    const onSelect = vi.fn();
    render(<PromptSuggestions suggestions={[{ id: "a", label: "Short", prompt: "The long prompt" }]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Short" }));
    expect(onSelect.mock.calls[0]?.[0]).toBe("The long prompt");
  });

  it("is keyboard reachable and respects disabled", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<PromptSuggestions suggestions={["One"]} onSelect={onSelect} />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "One" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    rerender(<PromptSuggestions suggestions={["One"]} onSelect={onSelect} disabled />);
    expect(screen.getByRole("button", { name: "One" })).toBeDisabled();
  });

  it("renders nothing when empty", () => {
    const { container } = render(<PromptSuggestions suggestions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
