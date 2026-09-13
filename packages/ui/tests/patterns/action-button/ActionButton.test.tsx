import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus, Search } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionButton, type ActionItem } from "../../../src/patterns/action-button/ActionButton";

const mockMatchMedia = (matches: boolean): void => {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
    media: "(min-width: 768px)",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList);
};

function makeActions(): ActionItem[] {
  return [
    { id: "a", label: "New order", icon: Plus, onSelect: vi.fn() },
    { id: "b", label: "New customer", icon: Plus, onSelect: vi.fn() },
  ];
}

describe("ActionButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("data-ui-fab");
  });

  it("has an accessible label", () => {
    mockMatchMedia(false);
    render(<ActionButton label="Quick actions" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Quick actions" })).toBeInTheDocument();
  });

  it("single-action mode fires onClick and opens no sheet", () => {
    mockMatchMedia(false);
    const onClick = vi.fn();
    render(<ActionButton label="Quick actions" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Quick actions" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("multi-action mode opens the ActionSheet on phone", () => {
    mockMatchMedia(false);
    render(<ActionButton label="Quick actions" actions={makeActions()} sheetTitle="New" />);
    fireEvent.click(screen.getByRole("button", { name: "Quick actions" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New order" })).toBeInTheDocument();
  });

  it("closes before onSelect fires (ordering)", () => {
    mockMatchMedia(false);
    const calls: string[] = [];
    const actions: ActionItem[] = [
      { id: "a", label: "Do it", icon: Plus, onSelect: () => calls.push("select") },
    ];
    const onOpenChange = vi.fn((open: boolean) => {
      if (!open) calls.push("close");
    });
    render(<ActionButton label="Quick actions" actions={actions} open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Do it" }));
    expect(calls).toEqual(["close", "select"]);
  });

  it("Cancel closes without selecting", () => {
    mockMatchMedia(false);
    const onOpenChange = vi.fn();
    render(
      <ActionButton label="Quick actions" actions={makeActions()} open onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not fire onSelect for a disabled action", () => {
    mockMatchMedia(false);
    const onSelect = vi.fn();
    const actions: ActionItem[] = [{ id: "a", label: "Disabled", icon: Plus, onSelect, disabled: true }];
    render(<ActionButton label="Quick actions" actions={actions} open onOpenChange={vi.fn()} />);
    const row = screen.getByRole("button", { name: "Disabled" });
    expect(row).toBeDisabled();
    fireEvent.click(row);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders secondary actions after a divider", () => {
    mockMatchMedia(false);
    const secondary: ActionItem[] = [{ id: "s", label: "Search", icon: Search, onSelect: vi.fn() }];
    render(
      <ActionButton
        label="Quick actions"
        actions={makeActions()}
        secondaryActions={secondary}
        open
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getAllByRole("separator").length).toBeGreaterThanOrEqual(1);
  });

  it("supports controlled open", () => {
    mockMatchMedia(false);
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ActionButton label="Quick actions" actions={makeActions()} open={false} onOpenChange={onOpenChange} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<ActionButton label="Quick actions" actions={makeActions()} open onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("hidden removes the trigger from the tab order", () => {
    mockMatchMedia(false);
    const { rerender } = render(<ActionButton label="Quick actions" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Quick actions" })).toBeInTheDocument();
    rerender(<ActionButton label="Quick actions" onClick={vi.fn()} hidden />);
    expect(screen.queryByRole("button", { name: "Quick actions" })).not.toBeInTheDocument();
  });

  it("sets data-ui-fab for placement=corner and removes it on unmount", () => {
    mockMatchMedia(false);
    const { unmount } = render(
      <ActionButton label="Quick actions" onClick={vi.fn()} placement="corner" side="right" />,
    );
    expect(document.documentElement).toHaveAttribute("data-ui-fab", "right");
    unmount();
    expect(document.documentElement).not.toHaveAttribute("data-ui-fab");
  });

  it("does not set data-ui-fab for placement=docked", () => {
    mockMatchMedia(false);
    render(<ActionButton label="Quick actions" onClick={vi.fn()} placement="docked" />);
    expect(document.documentElement).not.toHaveAttribute("data-ui-fab");
  });

  it("opens a DropdownMenu instead of the sheet from the desktop breakpoint", async () => {
    mockMatchMedia(true);
    render(<ActionButton label="Quick actions" actions={makeActions()} />);
    const trigger = screen.getByRole("button", { name: "Quick actions" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());
    expect(screen.getByRole("menuitem", { name: /New order/ })).toBeInTheDocument();
  });
});
