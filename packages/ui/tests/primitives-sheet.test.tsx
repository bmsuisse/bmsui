import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../src/primitives/sheet";

describe("Sheet", () => {
  it("opens on trigger click and shows its content", async () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>Make changes to your profile here.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Cancel</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.queryByText("Edit profile")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("Edit profile")).toBeInTheDocument();
    expect(screen.getByText("Make changes to your profile here.")).toBeInTheDocument();
  });

  it("closes via the built-in close button", async () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Settings</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    await userEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("Settings")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Close"));
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("closes via a SheetClose element", async () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Settings</SheetTitle>
          <SheetFooter>
            <SheetClose>Cancel</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    await userEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("Settings")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it.each(["left", "right", "top", "bottom"] as const)(
    "renders without throwing for side=%s",
    async (side) => {
      render(
        <Sheet>
          <SheetTrigger>Open {side}</SheetTrigger>
          <SheetContent side={side}>
            <SheetTitle>{side} sheet</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      await userEvent.click(screen.getByText(`Open ${side}`));
      expect(await screen.findByText(`${side} sheet`)).toBeInTheDocument();
    },
  );
});
