import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionDialog } from "../../../src/patterns/modal/QuestionDialog";

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

describe("QuestionDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders title, description, and every action plus Cancel", () => {
    render(
      <QuestionDialog
        open
        onOpenChange={vi.fn()}
        title="Save changes?"
        description="You have unsaved edits."
        actions={[
          { label: "Don't Save", onClick: vi.fn() },
          { label: "Save", onClick: vi.fn() },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Save changes?" })).toBeInTheDocument();
    expect(screen.getByText("You have unsaved edits.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Don't Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("puts the primary (last) action opposite Cancel — leading, with Cancel trailing — on Windows", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    render(
      <QuestionDialog
        open
        onOpenChange={vi.fn()}
        title="Save changes?"
        actions={[
          { label: "Don't Save", onClick: vi.fn() },
          { label: "Save", onClick: vi.fn() },
        ]}
      />,
    );

    const buttons = screen
      .getAllByRole("button", { name: /^(Don't Save|Save|Cancel)$/ })
      .map((button) => button.textContent);
    expect(buttons).toEqual(["Save", "Don't Save", "Cancel"]);
  });

  it("puts the primary (last) action opposite Cancel — trailing, with Cancel leading — on iOS", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );
    render(
      <QuestionDialog
        open
        onOpenChange={vi.fn()}
        title="Save changes?"
        actions={[
          { label: "Don't Save", onClick: vi.fn() },
          { label: "Save", onClick: vi.fn() },
        ]}
      />,
    );

    const buttons = screen
      .getAllByRole("button", { name: /^(Don't Save|Save|Cancel)$/ })
      .map((button) => button.textContent);
    expect(buttons).toEqual(["Cancel", "Don't Save", "Save"]);
  });

  it("cancel closes without calling any action", async () => {
    const onOpenChange = vi.fn();
    const save = vi.fn();
    const dontSave = vi.fn();
    render(
      <QuestionDialog
        open
        onOpenChange={onOpenChange}
        title="Save changes?"
        actions={[
          { label: "Don't Save", onClick: dontSave },
          { label: "Save", onClick: save },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(save).not.toHaveBeenCalled();
    expect(dontSave).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clicking an action calls its onClick and auto-closes on success", async () => {
    const onOpenChange = vi.fn();
    const save = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionDialog
        open
        onOpenChange={onOpenChange}
        title="Save changes?"
        actions={[{ label: "Don't Save", onClick: vi.fn() }, { label: "Save", onClick: save }]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(save).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables every button and shows a pending state on the clicked action while its promise is pending", async () => {
    const deferred = createDeferred<void>();
    const save = vi.fn().mockReturnValue(deferred.promise);
    const onOpenChange = vi.fn();
    render(
      <QuestionDialog
        open
        onOpenChange={onOpenChange}
        title="Save changes?"
        actions={[{ label: "Don't Save", onClick: vi.fn() }, { label: "Save", onClick: save }]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Save…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Don't Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(onOpenChange).not.toHaveBeenCalled();

    deferred.resolve();
    await screen.findByRole("button", { name: "Save" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not close the dialog and does not silently discard a rejected action", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const onOpenChange = vi.fn();
      const error = new Error("boom");
      const save = vi.fn().mockRejectedValue(error);
      render(
        <QuestionDialog
          open
          onOpenChange={onOpenChange}
          title="Save changes?"
          actions={[{ label: "Save", onClick: save }]}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      await screen.findByRole("button", { name: "Save" });
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(error);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("forwards testId/cancelTestId onto each action's and the cancel button", () => {
    render(
      <QuestionDialog
        open
        onOpenChange={vi.fn()}
        title="Save changes?"
        actions={[{ label: "Save", onClick: vi.fn(), testId: "save-action" }]}
        cancelTestId="cancel-action"
      />,
    );

    expect(screen.getByTestId("save-action")).toHaveTextContent("Save");
    expect(screen.getByTestId("cancel-action")).toHaveTextContent("Cancel");
  });

  it("applies each action's own variant", () => {
    render(
      <QuestionDialog
        open
        onOpenChange={vi.fn()}
        title="Save changes?"
        actions={[{ label: "Delete", onClick: vi.fn(), variant: "destructive" }]}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-destructive");
  });
});
