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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

  it("keeps Radix's data-state on trigger, content, checked items and sub-trigger", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent data-testid="content">
          <DropdownMenuCheckboxItem checked>On</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked="indeterminate">Some</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="b">
            <DropdownMenuRadioItem value="a">A</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">B</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub defaultOpen>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Nested</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByText("Menu")).toHaveAttribute("data-state", "open");
    expect(await screen.findByTestId("content")).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("menuitemcheckbox", { name: "On" })).toHaveAttribute("data-state", "checked");
    const some = screen.getByRole("menuitemcheckbox", { name: "Some" });
    expect(some).toHaveAttribute("data-state", "indeterminate");
    expect(some).toHaveAttribute("aria-checked", "mixed");
    expect(screen.getByRole("menuitemradio", { name: "A" })).toHaveAttribute("data-state", "unchecked");
    expect(screen.getByRole("menuitemradio", { name: "B" })).toHaveAttribute("data-state", "checked");
    expect(screen.getByText("More").closest("[role=menuitem]")).toHaveAttribute("data-state", "open");
    expect(await screen.findByText("Nested")).toBeInTheDocument();
  });

  it("Escape in a submenu closes the whole menu, like Radix", async () => {
    const onOpenChange = vi.fn();
    render(
      <DropdownMenu defaultOpen onOpenChange={onOpenChange}>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub defaultOpen>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Nested</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const nested = await screen.findByRole("menuitem", { name: "Nested" });
    nested.focus();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stays open when onSelect calls preventDefault, and a checkbox still toggles", async () => {
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Stay</DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked={false}
            onCheckedChange={onCheckedChange}
            onSelect={(event) => event.preventDefault()}
          >
            Flag
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(await screen.findByText("Stay"));
    await userEvent.click(screen.getByText("Flag"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Menu")).toHaveAttribute("data-state", "open");
  });
});
