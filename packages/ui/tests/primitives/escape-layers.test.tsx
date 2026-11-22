// Only the topmost layer closes on Escape (Radix: the highest DismissableLayer), whatever the bridge does.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "../../src/primitives/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../src/primitives/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../../src/primitives/popover";

it("menu in dialog: Escape closes only the menu", async () => {
  const dialog = vi.fn();
  const menu = vi.fn();
  render(
    <Dialog defaultOpen onOpenChange={dialog}>
      <DialogContent>
        <DialogTitle>T</DialogTitle>
        <DropdownMenu onOpenChange={menu}>
          <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
          <DropdownMenuContent><DropdownMenuItem>Top</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </DialogContent>
    </Dialog>,
  );
  await userEvent.click(await screen.findByText("Menu"));
  (await screen.findByRole("menuitem", { name: "Top" })).focus();
  await userEvent.keyboard("{Escape}");
  expect(menu).toHaveBeenLastCalledWith(false);
  expect(dialog).not.toHaveBeenCalledWith(false);
});

it("popover in dialog: Escape closes only the popover", async () => {
  const dialog = vi.fn();
  const pop = vi.fn();
  render(
    <Dialog defaultOpen onOpenChange={dialog}>
      <DialogContent>
        <DialogTitle>T</DialogTitle>
        <Popover onOpenChange={pop}>
          <PopoverTrigger>Pop</PopoverTrigger>
          <PopoverContent><button type="button">In</button></PopoverContent>
        </Popover>
      </DialogContent>
    </Dialog>,
  );
  await userEvent.click(await screen.findByText("Pop"));
  (await screen.findByRole("button", { name: "In" })).focus();
  await userEvent.keyboard("{Escape}");
  expect(pop).toHaveBeenLastCalledWith(false);
  expect(dialog).not.toHaveBeenCalledWith(false);
});
