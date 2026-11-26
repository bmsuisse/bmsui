import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal, ModalBody, ModalFooter } from "../../../src/patterns/modal/Modal";
import { Dialog, DialogContent, DialogTitle } from "../../../src/primitives/dialog";
import { mockViewport } from "../../viewport";

afterEach(() => vi.restoreAllMocks());

describe("Modal responsive surface", () => {
  it("is a bottom sheet on a phone", () => {
    mockViewport("phone");
    render(
      <Modal open onOpenChange={vi.fn()} title="Edit">
        <p>Body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "sheet-content");
    expect(dialog).toHaveAttribute("data-side", "bottom");
    expect(screen.getByTestId("sheet-drag-handle")).toBeInTheDocument();
  });

  it("is a centred dialog on desktop", () => {
    mockViewport("desktop");
    render(
      <Modal open onOpenChange={vi.fn()} title="Edit">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).not.toHaveAttribute("data-slot", "sheet-content");
    expect(screen.queryByTestId("sheet-drag-handle")).not.toBeInTheDocument();
  });

  it("alwaysCentered keeps the centred dialog on a phone", () => {
    mockViewport("phone");
    render(
      <Modal open onOpenChange={vi.fn()} title="Edit" alwaysCentered>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).not.toHaveAttribute("data-slot", "sheet-content");
  });

  it("a sheet ignores the caller's width class: it is always full width", () => {
    mockViewport("phone");
    render(
      <Modal open onOpenChange={vi.fn()} title="Edit" className="max-w-2xl">
        <p>Body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-w-none");
    expect(dialog).not.toHaveClass("max-w-2xl");
  });

  it("DialogContent is responsive on its own, with the same header/close parts", async () => {
    mockViewport("phone");
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent closeButtonTestId="close">
          <DialogTitle>Plain dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("data-slot", "sheet-content");
    await userEvent.click(screen.getByTestId("close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("the header close button closes the modal and is a generous touch target on a phone", async () => {
    mockViewport("phone");
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Edit">
        <p>Body</p>
      </Modal>,
    );
    const close = screen.getByTestId("modal-close");
    expect(close.className).toContain("max-md:size-11");
    await userEvent.click(close);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Escape closes a sheet", async () => {
    mockViewport("phone");
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Edit">
        <p>Body</p>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Modal header and composition", () => {
  it("renders header actions and a back arrow that calls onBack", async () => {
    mockViewport("desktop");
    const onBack = vi.fn();
    render(
      <Modal
        open
        onOpenChange={vi.fn()}
        title="Offer 7"
        onBack={onBack}
        backTitle="Customer"
        headerActions={<button type="button">Menu</button>}
      >
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("modal-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("modal-back")).toHaveAttribute("title", "Customer");
  });

  it("wraps plain children in one scrolling body", () => {
    mockViewport("desktop");
    render(
      <Modal open onOpenChange={vi.fn()} title="Edit" footer={<button type="button">Save</button>}>
        <p>Body</p>
      </Modal>,
    );
    expect(document.querySelectorAll('[data-slot="dialog-body"]')).toHaveLength(1);
  });

  it("lays out composed ModalBody/ModalFooter children as given (no second body)", () => {
    mockViewport("desktop");
    render(
      <Modal open onOpenChange={vi.fn()} title="Edit">
        <ModalBody>Composed body</ModalBody>
        <ModalFooter>
          <button type="button">Go</button>
        </ModalFooter>
      </Modal>,
    );
    expect(document.querySelectorAll('[data-slot="dialog-body"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="dialog-footer"]')).toHaveLength(1);
  });

  it("sees a composed child inside a fragment", () => {
    mockViewport("desktop");
    render(
      <Modal open onOpenChange={vi.fn()} title="Edit">
        <>
          <ModalBody>Composed body</ModalBody>
        </>
      </Modal>,
    );
    expect(document.querySelectorAll('[data-slot="dialog-body"]')).toHaveLength(1);
  });
});
