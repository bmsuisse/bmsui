import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../src/primitives/context-menu";

describe("ContextMenu", () => {
  it("opens on contextmenu and runs the selected item", () => {
    const onSelect = vi.fn();
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={onSelect}>Open</ContextMenuItem>
          <ContextMenuItem danger>Delete</ContextMenuItem>
          <ContextMenuCheckboxItem checked>Pinned</ContextMenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.contextMenu(screen.getByText("Area"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Delete").className).toContain("text-red-700");
    expect(screen.getByRole("menuitemcheckbox", { name: "Pinned" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByText("Open"));
    expect(onSelect).toHaveBeenCalled();
  });
});
