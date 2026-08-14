import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../src/primitives/dropdown-menu";

describe("DropdownMenu", () => {
  it("opens on trigger click and shows its items", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem danger>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Actions"));
    expect(await screen.findByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("My account")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onSelect when an item is clicked and closes the menu", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await userEvent.click(screen.getByText("Actions"));
    await userEvent.click(await screen.findByText("Edit"));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("does not fire onSelect for a disabled item", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect} disabled>
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await userEvent.click(screen.getByText("Actions"));
    await userEvent.click(await screen.findByText("Edit"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("toggles a checkbox item via onCheckedChange", async () => {
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>View</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
            Show archived
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await userEvent.click(screen.getByText("View"));
    await userEvent.click(await screen.findByText("Show archived"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("selects a radio item via onValueChange", async () => {
    const onValueChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Sort</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="asc" onValueChange={onValueChange}>
            <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await userEvent.click(screen.getByText("Sort"));
    await userEvent.click(await screen.findByText("Descending"));
    expect(onValueChange).toHaveBeenCalledWith("desc");
  });
});
