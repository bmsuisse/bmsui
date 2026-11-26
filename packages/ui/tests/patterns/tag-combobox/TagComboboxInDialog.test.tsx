import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "../../../src/patterns/combobox/Combobox";
import { TagCombobox, type TagComboboxOption } from "../../../src/patterns/tag-combobox/TagCombobox";
import { Dialog, DialogContent, DialogTitle } from "../../../src/primitives/dialog";
import { mockViewport } from "../../viewport";

const OPTIONS: TagComboboxOption[] = [
  { value: "ch", label: "Switzerland" },
  { value: "de", label: "Germany" },
];

function Tags() {
  const [value, setValue] = useState<string[]>([]);
  return <TagCombobox options={OPTIONS} value={value} onChange={setValue} />;
}

function InDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog defaultOpen onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Edit</DialogTitle>
        <Tags />
        <button type="button">Next field</button>
      </DialogContent>
    </Dialog>
  );
}

describe.each(["desktop", "phone"] as const)("TagCombobox in a dialog (%s)", (viewport) => {
  const open = async () => {
    mockViewport(viewport);
    const onOpenChange = vi.fn();
    render(<InDialog onOpenChange={onOpenChange} />);
    const input = await screen.findByRole("textbox");
    await userEvent.click(input);
    await screen.findByRole("option", { name: "Switzerland" });
    return { input, onOpenChange };
  };

  it("Escape closes the option list first and leaves the dialog open", async () => {
    const { onOpenChange } = await open();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("option", { name: "Switzerland" })).not.toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("a second Escape then closes the dialog", async () => {
    const { onOpenChange } = await open();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("option", { name: "Switzerland" })).not.toBeInTheDocument());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("Escape with the list already closed closes the dialog", async () => {
    mockViewport(viewport);
    const onOpenChange = vi.fn();
    render(<InDialog onOpenChange={onOpenChange} />);
    (await screen.findByRole("button", { name: "Next field" })).focus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("the option list closes when focus is moved there programmatically", async () => {
    await open();
    screen.getByRole("button", { name: "Next field" }).focus();
    await waitFor(() => expect(screen.queryByRole("option", { name: "Switzerland" })).not.toBeInTheDocument());
  });

  it("picking an option keeps the list open and the input focused", async () => {
    const { input } = await open();
    await userEvent.click(screen.getByRole("option", { name: "Switzerland" }));
    expect(screen.getByRole("option", { name: "Germany" })).toBeInTheDocument();
    expect(input).toHaveFocus();
  });
});

describe("Combobox (single) in a dialog stays correct", () => {
  it("Escape closes the list first, then the dialog", async () => {
    mockViewport("desktop");
    const onOpenChange = vi.fn();
    render(
      <Dialog defaultOpen onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Edit</DialogTitle>
          <Combobox options={OPTIONS} value="" onChange={() => {}} />
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(await screen.findByRole("combobox"));
    await screen.findByRole("option", { name: "Switzerland" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("option", { name: "Switzerland" })).not.toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
