import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../../src/patterns/modal/ConfirmDialog";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("ConfirmDialog", () => {
  it("renders title and description", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete record"
        description="This action is permanent."
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Delete record" })).toBeInTheDocument();
    expect(screen.getByText("This action is permanent.")).toBeInTheDocument();
  });

  it("cancel closes without calling onConfirm", async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open onOpenChange={onOpenChange} title="Delete" onConfirm={onConfirm} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("confirm calls onConfirm and auto-closes on success", async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmDialog open onOpenChange={onOpenChange} title="Delete" onConfirm={onConfirm} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables both buttons and shows a pending state while onConfirm's promise is pending", async () => {
    const deferred = createDeferred<void>();
    const onConfirm = vi.fn().mockReturnValue(deferred.promise);
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog open onOpenChange={onOpenChange} title="Delete" onConfirm={onConfirm} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByRole("button", { name: "Confirm…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(onOpenChange).not.toHaveBeenCalled();

    deferred.resolve();
    await screen.findByRole("button", { name: "Confirm" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not close the dialog and does not silently discard a rejected onConfirm", async () => {
    // ConfirmDialog logs the failure (visible below via the console.error
    // spy) instead of pretending nothing happened, and — most importantly —
    // never calls onOpenChange(false), so the dialog stays open for the
    // caller to show its own error state.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const onOpenChange = vi.fn();
      const error = new Error("boom");
      const onConfirm = vi.fn().mockRejectedValue(error);
      render(
        <ConfirmDialog open onOpenChange={onOpenChange} title="Delete" onConfirm={onConfirm} />,
      );

      await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

      // Buttons re-enable once the rejected promise settles...
      await screen.findByRole("button", { name: "Confirm" });
      // ...but the dialog is never told to close.
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(error);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("applies the destructive button variant when variant='destructive'", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete"
        onConfirm={vi.fn()}
        variant="destructive"
      />,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass("bg-destructive");
  });

  it("uses the default (non-destructive) button variant when variant is omitted", () => {
    render(<ConfirmDialog open onOpenChange={vi.fn()} title="Delete" onConfirm={vi.fn()} />);

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    expect(confirmButton).not.toHaveClass("bg-destructive");
    expect(confirmButton).toHaveClass("bg-primary");
  });

  it("forwards confirmTestId/cancelTestId onto the confirm/cancel buttons", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete"
        onConfirm={vi.fn()}
        confirmTestId="confirm-delete"
        cancelTestId="cancel-delete"
      />,
    );

    expect(screen.getByTestId("confirm-delete")).toHaveTextContent("Confirm");
    expect(screen.getByTestId("cancel-delete")).toHaveTextContent("Cancel");
  });
});
