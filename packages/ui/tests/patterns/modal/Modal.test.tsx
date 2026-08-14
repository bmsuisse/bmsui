import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../../../src/patterns/modal/Modal";

describe("Modal", () => {
  it("renders title, description, body, and footer when open", () => {
    render(
      <Modal
        open
        onOpenChange={vi.fn()}
        title="Delete item"
        description="This cannot be undone."
        footer={<button type="button">OK</button>}
      >
        <p>Body content</p>
      </Modal>,
    );

    expect(screen.getByRole("heading", { name: "Delete item" })).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onOpenChange={vi.fn()} title="Hidden title">
        <p>Hidden body</p>
      </Modal>,
    );

    expect(screen.queryByText("Hidden title")).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden body")).not.toBeInTheDocument();
  });

  it("omits DialogDescription and DialogFooter when not provided", () => {
    render(
      <Modal open onOpenChange={vi.fn()} title="No extras">
        <p>Just body</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(/undone/i)).not.toBeInTheDocument();
  });

  it("applies a custom className to DialogContent for width overrides", () => {
    render(
      <Modal open onOpenChange={vi.fn()} title="Wide modal" className="max-w-2xl">
        <p>Body</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("max-w-2xl");
  });

  it("calls onOpenChange when dismissed via the built-in close control", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Dismissible">
        <p>Body</p>
      </Modal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
