// Audit: every component that opens a popup must close only that popup on the first Escape when it sits in a
// dialog (the dialog stays, so the user keeps what they typed) and let the second Escape through.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactElement, type ReactNode, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Combobox } from "../../src/patterns/combobox/Combobox";
import { ConfirmPopover } from "../../src/patterns/confirm-popover/ConfirmPopover";
import { DateInput } from "../../src/patterns/date-input/DateInput";
import { EmailAddressInput } from "../../src/patterns/email-address-input/EmailAddressInput";
import { TagCombobox } from "../../src/patterns/tag-combobox/TagCombobox";
import { TreeSelect } from "../../src/patterns/tree-select/TreeSelect";
import { Dialog, DialogContent, DialogTitle } from "../../src/primitives/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../src/primitives/select";
import { mockViewport } from "../viewport";

beforeAll(async () => {
  await import("../../src/patterns/calendar/Calendar");
});

interface Case {
  name: string;
  render: () => ReactElement;
  /** Opens the popup and resolves with a function telling whether it is still showing. */
  open: () => Promise<() => boolean>;
}

const OPTIONS = [
  { value: "ch", label: "Switzerland" },
  { value: "de", label: "Germany" },
];

const cases: Case[] = [
  {
    name: "Combobox",
    render: () => <Combobox options={OPTIONS} value="" onChange={() => {}} />,
    open: async () => {
      await userEvent.click(await screen.findByRole("combobox"));
      await screen.findByRole("option", { name: "Switzerland" });
      return () => screen.queryByRole("option", { name: "Switzerland" }) !== null;
    },
  },
  {
    name: "TagCombobox",
    render: () => <TagCombobox options={OPTIONS} value={[]} onChange={() => {}} />,
    open: async () => {
      await userEvent.click(await screen.findByRole("textbox"));
      await screen.findByRole("option", { name: "Switzerland" });
      return () => screen.queryByRole("option", { name: "Switzerland" }) !== null;
    },
  },
  {
    name: "EmailAddressInput (suggestions)",
    render: () => (
      <EmailAddressInput
        aria-label="To"
        suggestions={[{ email: "anna@example.ch", name: "Anna" }]}
      />
    ),
    open: async () => {
      const input = await screen.findByRole("combobox");
      await userEvent.type(input, "an");
      await screen.findByRole("option", { name: /anna@example.ch/ });
      return () => screen.queryByRole("option", { name: /anna@example.ch/ }) !== null;
    },
  },
  {
    name: "TreeSelect",
    render: () => <TreeSelect nodes={[{ value: "root", label: "Zurich branch", children: [] }]} value={null} onChange={() => {}} />,
    open: async () => {
      await userEvent.click(await screen.findByRole("combobox"));
      await screen.findByText("Zurich branch");
      return () => screen.queryByText("Zurich branch") !== null;
    },
  },
  {
    name: "DateInput (calendar)",
    render: () => <DateInput aria-label="Due" picker="calendar" value="2026-11-10" onValueChange={() => {}} />,
    open: async () => {
      const input = await screen.findByLabelText("Due");
      input.focus();
      await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
      await screen.findByRole("grid");
      return () => screen.queryByRole("grid") !== null;
    },
  },
  // DateRangePicker: its calendar takes focus asynchronously, which jsdom does not reproduce; it is checked in a
  // real browser by e2e/modal-lab.spec.ts ("Popup components inside a modal").
  {
    name: "ConfirmPopover",
    render: () => <ConfirmPopover trigger={<button type="button">Delete</button>} message="Delete this?" onConfirm={() => {}} />,
    open: async () => {
      await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
      await screen.findByRole("alertdialog");
      return () => screen.queryByRole("alertdialog") !== null;
    },
  },
  {
    name: "Select",
    render: () => (
      <Select>
        <SelectTrigger aria-label="Country">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ch">Switzerland</SelectItem>
        </SelectContent>
      </Select>
    ),
    open: async () => {
      await userEvent.click(await screen.findByRole("combobox", { name: "Country" }));
      await screen.findByRole("option", { name: "Switzerland" });
      return () => screen.queryByRole("option", { name: "Switzerland" }) !== null;
    },
  },
];

function Host({ children, onOpenChange }: { children: ReactNode; onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setOpen(next);
      }}
    >
      <DialogContent>
        <DialogTitle>Edit</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}

describe.each(cases)("$name in a dialog", ({ render: renderCase, open }) => {
  it("the first Escape closes only its popup, the second closes the dialog", async () => {
    mockViewport("desktop");
    const onOpenChange = vi.fn();
    render(<Host onOpenChange={onOpenChange}>{renderCase()}</Host>);
    const showing = await open();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(showing()).toBe(false));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

// The other half of the audit: a popup must not stay open once focus has moved to another field. Only the
// components whose focus stays in their input matter here; the others (calendars, Select, ConfirmPopover)
// move focus into the popup, where the floating layer already closes on focus-out (checked in real browsers).
const KEEPS_FOCUS_IN_INPUT = ["Combobox", "TagCombobox", "EmailAddressInput (suggestions)", "TreeSelect"];
describe.each(cases.filter((c) => KEEPS_FOCUS_IN_INPUT.includes(c.name)))("$name: focus moving away", ({ render: renderCase, open }) => {
  it("closes the popup when another field takes focus", async () => {
    mockViewport("desktop");
    render(
      <Host onOpenChange={() => {}}>
        {renderCase()}
        <button type="button">Elsewhere</button>
      </Host>,
    );
    const showing = await open();
    screen.getByRole("button", { name: "Elsewhere" }).focus();
    await waitFor(() => expect(showing()).toBe(false));
  });
});
