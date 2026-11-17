import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmPopover } from "../../../src/patterns/confirm-popover/ConfirmPopover";

const setup = (onConfirm = vi.fn()) =>
  render(<ConfirmPopover trigger={<button>Delete</button>} message="Delete this?" confirmLabel="Delete it" onConfirm={onConfirm} />);

describe("ConfirmPopover", () => {
  it("opens with focus on the safe action", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Delete this?");
    await waitFor(() => expect(screen.getByRole("button", { name: "Keep" })).toHaveFocus());
  });

  it("confirms and closes", async () => {
    const onConfirm = vi.fn();
    setup(onConfirm);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete it" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("closes on Keep and Escape without confirming", async () => {
    const onConfirm = vi.fn();
    setup(onConfirm);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("stays open when the confirm promise rejects", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("no"));
    setup(onConfirm);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete it" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("disables confirm while pending and honours labels", async () => {
    render(<ConfirmPopover defaultOpen pending trigger={<button>T</button>} message="m" labels={{ confirm: "Ja", keep: "Nein" }} onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: "Ja" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nein" })).toBeInTheDocument();
  });
});
