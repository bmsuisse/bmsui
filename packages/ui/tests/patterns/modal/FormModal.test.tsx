import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormModal } from "../../../src/patterns/modal/FormModal";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("FormModal", () => {
  it("renders title, description, and its form fields", () => {
    render(
      <FormModal
        open
        onOpenChange={vi.fn()}
        title="Add rebate"
        description="Fill in the rebate details."
        onSubmit={vi.fn()}
      >
        <input aria-label="Name" />
      </FormModal>,
    );

    expect(screen.getByRole("heading", { name: "Add rebate" })).toBeInTheDocument();
    expect(screen.getByText("Fill in the rebate details.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("cancel closes the modal without calling onSubmit", async () => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <FormModal open onOpenChange={onOpenChange} title="Add rebate" onSubmit={onSubmit}>
        <input aria-label="Name" />
      </FormModal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clicking submit calls onSubmit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FormModal open onOpenChange={vi.fn()} title="Add rebate" onSubmit={onSubmit}>
        <input aria-label="Name" />
      </FormModal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("pressing Enter in a field also submits the form", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FormModal open onOpenChange={vi.fn()} title="Add rebate" onSubmit={onSubmit}>
        <input aria-label="Name" />
      </FormModal>,
    );

    await userEvent.type(screen.getByLabelText("Name"), "Acme{Enter}");
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("disables submit and cancel while onSubmit's promise is pending", async () => {
    const deferred = createDeferred<void>();
    const onSubmit = vi.fn().mockReturnValue(deferred.promise);
    render(
      <FormModal open onOpenChange={vi.fn()} title="Add rebate" onSubmit={onSubmit}>
        <input aria-label="Name" />
      </FormModal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Save…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    deferred.resolve();
    await screen.findByRole("button", { name: "Save" });
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("submitDisabled disables submit but leaves cancel enabled, and blocks onSubmit", async () => {
    const onSubmit = vi.fn();
    render(
      <FormModal open onOpenChange={vi.fn()} title="Add rebate" onSubmit={onSubmit} submitDisabled>
        <input aria-label="Name" />
      </FormModal>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).not.toBeDisabled();
  });

  it("applies a custom className to the dialog content", () => {
    render(
      <FormModal
        open
        onOpenChange={vi.fn()}
        title="Add rebate"
        onSubmit={vi.fn()}
        className="max-w-2xl"
      >
        <input aria-label="Name" />
      </FormModal>,
    );
    expect(screen.getByRole("heading", { name: "Add rebate" }).closest('[role="dialog"]')).toHaveClass(
      "max-w-2xl",
    );
  });

  it("forwards submitTestId/cancelTestId to their respective buttons", () => {
    render(
      <FormModal
        open
        onOpenChange={vi.fn()}
        title="Add rebate"
        onSubmit={vi.fn()}
        submitTestId="rebate-submit"
        cancelTestId="rebate-cancel"
      >
        <input aria-label="Name" />
      </FormModal>,
    );
    expect(screen.getByTestId("rebate-submit")).toBe(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByTestId("rebate-cancel")).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("does NOT auto-close after a successful submit (caller decides via onOpenChange)", async () => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FormModal open onOpenChange={onOpenChange} title="Add rebate" onSubmit={onSubmit}>
        <input aria-label="Name" />
      </FormModal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: "Save" }); // pending state settled
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
