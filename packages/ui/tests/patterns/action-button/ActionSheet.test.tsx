import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bell, Plus, Search } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ActionItem } from "../../../src/patterns/action-button/ActionButton";
import { ActionSheet } from "../../../src/patterns/action-button/ActionSheet";

function makeActions(onSelect: (id: string) => void): ActionItem[] {
  return [
    { id: "new-order", label: "New order", sublabel: "Start from a blank form", icon: Plus, onSelect: () => onSelect("new-order") },
    { id: "new-customer", label: "New customer", icon: Plus, onSelect: () => onSelect("new-customer"), disabled: true },
  ];
}

describe("ActionSheet", () => {
  it("renders a title, rows and a Cancel row", () => {
    render(
      <ActionSheet open onOpenChange={vi.fn()} title="New" actions={makeActions(vi.fn())} />,
    );
    expect(screen.getByRole("heading", { name: "New" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New order/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("closes before firing onSelect, in that order", () => {
    const calls: string[] = [];
    const onOpenChange = vi.fn(() => calls.push("close"));
    const actions: ActionItem[] = [
      { id: "a", label: "Do it", icon: Plus, onSelect: () => calls.push("select") },
    ];
    render(<ActionSheet open onOpenChange={onOpenChange} actions={actions} />);
    fireEvent.click(screen.getByRole("button", { name: "Do it" }));
    expect(calls).toEqual(["close", "select"]);
  });

  it("Cancel closes without selecting any action", () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(<ActionSheet open onOpenChange={onOpenChange} actions={makeActions(onSelect)} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not fire onSelect for a disabled action", () => {
    const onSelect = vi.fn();
    render(<ActionSheet open onOpenChange={vi.fn()} actions={makeActions(onSelect)} />);
    const disabledRow = screen.getByRole("button", { name: /New customer/ });
    expect(disabledRow).toBeDisabled();
    fireEvent.click(disabledRow);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders secondary actions after a divider, with muted icon tiles", () => {
    const secondary: ActionItem[] = [
      { id: "search", label: "Search", icon: Search, onSelect: vi.fn() },
      { id: "feedback", label: "Feedback", icon: Bell, onSelect: vi.fn() },
    ];
    render(
      <ActionSheet
        open
        onOpenChange={vi.fn()}
        actions={makeActions(vi.fn())}
        secondaryActions={secondary}
      />,
    );
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Feedback" })).toBeInTheDocument();
    expect(screen.getAllByRole("separator").length).toBeGreaterThanOrEqual(2);
  });

  it("overrides the Cancel label via labels", () => {
    render(
      <ActionSheet open onOpenChange={vi.fn()} actions={makeActions(vi.fn())} labels={{ cancel: "Dismiss" }} />,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("returns focus to the trigger on close", async () => {
    function Harness(): ReactElement {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>open sheet</button>
          <ActionSheet open={open} onOpenChange={setOpen} actions={makeActions(vi.fn())} />
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "open sheet" });
    trigger.focus();
    await userEvent.click(trigger);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
