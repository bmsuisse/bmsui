import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionsMenu } from "../../src/menu/ActionsMenu";
import type { MenuItem } from "../../src/menu/types";

interface Row {
  id: string;
  archived: boolean;
}

const row: Row = { id: "1", archived: false };

describe("ActionsMenu", () => {
  it("renders nothing when every item is hidden", () => {
    const items: MenuItem<Row>[] = [{ id: "x", label: "X", visible: () => false, onSelect: vi.fn() }];
    render(<ActionsMenu items={items} ctx={{ row }} triggerLabel="Row actions" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens to show only visible items", async () => {
    const items: MenuItem<Row>[] = [
      { id: "edit", label: "Edit", onSelect: vi.fn() },
      { id: "restore", label: "Restore", visible: (ctx) => ctx.row?.archived === true, onSelect: vi.fn() },
    ];
    render(<ActionsMenu items={items} ctx={{ row }} triggerLabel="Row actions" />);

    await userEvent.click(screen.getByRole("button", { name: "Row actions" }));

    expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Restore" })).not.toBeInTheDocument();
  });

  it("calls onSelect with the context when an item is chosen", async () => {
    const onSelect = vi.fn();
    const items: MenuItem<Row>[] = [{ id: "edit", label: "Edit", onSelect }];
    render(<ActionsMenu items={items} ctx={{ row }} triggerLabel="Row actions" />);

    await userEvent.click(screen.getByRole("button", { name: "Row actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));

    expect(onSelect).toHaveBeenCalledWith({ row });
  });

  it("does not call onSelect for a disabled item", async () => {
    const onSelect = vi.fn();
    const items: MenuItem<Row>[] = [
      { id: "delete", label: "Delete", disabled: () => true, onSelect },
    ];
    render(<ActionsMenu items={items} ctx={{ row }} triggerLabel="Row actions" />);

    await userEvent.click(screen.getByRole("button", { name: "Row actions" }));
    const menuItem = await screen.findByRole("menuitem", { name: "Delete" });
    expect(menuItem).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(menuItem);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("evaluates against selectedRows for the header-actions use case", async () => {
    const onSelect = vi.fn();
    const items: MenuItem<Row>[] = [{ id: "bulk", label: "Bulk archive", onSelect }];
    render(
      <ActionsMenu items={items} ctx={{ selectedRows: [row] }} triggerLabel="Bulk actions" />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Bulk actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Bulk archive" }));

    expect(onSelect).toHaveBeenCalledWith({ selectedRows: [row] });
  });
});
