import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SplitButton } from "../../../src/patterns/split-button/SplitButton";

describe("SplitButton", () => {
  it("runs the primary action", async () => {
    const onClick = vi.fn();
    render(<SplitButton onClick={onClick} items={[]}>Send</SplitButton>);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("opens the menu from the chevron and selects an item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SplitButton
        items={[
          { id: "close", label: "Send and close", onSelect },
          { id: "later", label: "Send later", onSelect: () => {}, disabled: true },
        ]}
      >
        Send
      </SplitButton>,
    );
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menuitem", { name: "Send later" })).toHaveAttribute("data-disabled");
    await user.click(screen.getByRole("menuitem", { name: "Send and close" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and returns focus to the chevron", async () => {
    const user = userEvent.setup();
    render(<SplitButton menuLabel="Mehr" items={[{ id: "a", label: "A", onSelect: () => {} }]}>Send</SplitButton>);
    const chevron = screen.getByRole("button", { name: "Mehr" });
    chevron.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(chevron).toHaveFocus();
  });

  it("blocks both buttons while loading without the dimmed disabled look", () => {
    const onClick = vi.fn();
    render(<SplitButton loading onClick={onClick} items={[]}>Send</SplitButton>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "More actions" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("aria-busy", "true");
  });
});
