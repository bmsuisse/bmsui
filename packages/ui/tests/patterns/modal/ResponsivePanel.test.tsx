import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResponsivePanel } from "../../../src/patterns/modal/ResponsivePanel";

const mockMatchMedia = (matches: boolean): void => {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
    media: "(min-width: 1024px)",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList);
};

describe("ResponsivePanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders as a dialog on desktop", () => {
    mockMatchMedia(true);
    render(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Wide panel">
        <p>Body content</p>
      </ResponsivePanel>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("max-w-2xl");
    expect(screen.getByRole("heading", { name: "Wide panel" })).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("renders as a bottom-sheet drawer on mobile", () => {
    mockMatchMedia(false);
    render(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Drawer panel">
        <p>Body content</p>
      </ResponsivePanel>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("rounded-t-2xl");
    expect(screen.getByRole("heading", { name: "Drawer panel" })).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    mockMatchMedia(true);
    render(
      <ResponsivePanel open={false} onOpenChange={vi.fn()} title="Hidden">
        <p>Hidden body</p>
      </ResponsivePanel>,
    );

    expect(screen.queryByText("Hidden body")).not.toBeInTheDocument();
  });

  it("defaults to the lg desktop size and honors an explicit size override", () => {
    mockMatchMedia(true);
    const { rerender } = render(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Default size">
        <p>Body</p>
      </ResponsivePanel>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-w-2xl");

    rerender(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Default size" size="xl">
        <p>Body</p>
      </ResponsivePanel>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-w-7xl");
  });

  it("defaults to the lg drawer height and honors an explicit size override on mobile", () => {
    mockMatchMedia(false);
    const { rerender } = render(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Default size">
        <p>Body</p>
      </ResponsivePanel>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-h-[90vh]");

    rerender(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Default size" size="sm">
        <p>Body</p>
      </ResponsivePanel>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-h-[50vh]");
  });

  it("renders footer content when provided", () => {
    mockMatchMedia(true);
    render(
      <ResponsivePanel
        open
        onOpenChange={vi.fn()}
        title="With footer"
        footer={<button type="button">Save</button>}
      >
        <p>Body</p>
      </ResponsivePanel>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders a resize handle on all four corners on desktop only when resizable", () => {
    mockMatchMedia(true);
    const corners = ["top-left", "top-right", "bottom-left", "bottom-right"];
    const { rerender } = render(
      <ResponsivePanel open onOpenChange={vi.fn()} title="No resize">
        <p>Body</p>
      </ResponsivePanel>,
    );
    for (const corner of corners) {
      expect(screen.queryByTestId(`panel-resize-handle-${corner}`)).not.toBeInTheDocument();
    }

    rerender(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Resizable" resizable>
        <p>Body</p>
      </ResponsivePanel>,
    );
    for (const corner of corners) {
      expect(screen.getByTestId(`panel-resize-handle-${corner}`)).toBeInTheDocument();
    }
  });

  it("makes the desktop header draggable only when draggable is set", () => {
    mockMatchMedia(true);
    const { rerender } = render(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Not draggable">
        <p>Body</p>
      </ResponsivePanel>,
    );
    expect(screen.getByText("Not draggable").closest("div")).not.toHaveClass("cursor-move");

    rerender(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Draggable" draggable>
        <p>Body</p>
      </ResponsivePanel>,
    );
    expect(screen.getByText("Draggable").closest("div")).toHaveClass("cursor-move");
  });

  it("renders a drag handle on the mobile drawer only when resizable", () => {
    mockMatchMedia(false);
    const { rerender } = render(
      <ResponsivePanel open onOpenChange={vi.fn()} title="No resize">
        <p>Body</p>
      </ResponsivePanel>,
    );
    expect(screen.queryByTestId("sheet-drag-handle")).not.toBeInTheDocument();

    rerender(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Resizable" resizable>
        <p>Body</p>
      </ResponsivePanel>,
    );
    expect(screen.getByTestId("sheet-drag-handle")).toBeInTheDocument();
  });

  it("keeps the panel fully on-screen after a move followed by a resize", () => {
    mockMatchMedia(true);
    render(
      <ResponsivePanel open onOpenChange={vi.fn()} title="Move then resize" resizable draggable>
        <p>Body</p>
      </ResponsivePanel>,
    );
    const dialog = screen.getByRole("dialog");
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      left: 384,
      top: 360,
      width: 672,
      height: 180,
      right: 1056,
      bottom: 540,
      x: 384,
      y: 360,
      toJSON: () => ({}),
    } as DOMRect);

    const header = screen.getByRole("heading", { name: "Move then resize" }).closest("div");
    if (!header) throw new Error("header not found");
    fireEvent.pointerDown(header, { clientX: 500, clientY: 400 });
    fireEvent.pointerMove(header, { clientX: -600, clientY: -400 });
    fireEvent.pointerUp(header);

    expect(dialog.style.left).toBe("16px");
    expect(dialog.style.top).toBe("16px");
    expect(dialog.style.translate).toBe("none");

    const brHandle = screen.getByTestId("panel-resize-handle-bottom-right");
    fireEvent.pointerDown(brHandle, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(brHandle, { clientX: 2000, clientY: 2000 });
    fireEvent.pointerUp(brHandle);

    const left = Number.parseFloat(dialog.style.left);
    const top = Number.parseFloat(dialog.style.top);
    const width = Number.parseFloat(dialog.style.width);
    const height = Number.parseFloat(dialog.style.height);
    expect(dialog.style.translate).toBe("none");
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(left + width).toBeLessThanOrEqual(window.innerWidth);
    expect(top + height).toBeLessThanOrEqual(window.innerHeight);
  });

  it("does not close on an outside click when closeOnOutsideClick is false", async () => {
    mockMatchMedia(true);
    const onOpenChange = vi.fn();
    render(
      <ResponsivePanel open onOpenChange={onOpenChange} title="Locked" closeOnOutsideClick={false}>
        <p>Body</p>
      </ResponsivePanel>,
    );

    const overlay = document.querySelector('[class*="bg-black/50"]');
    if (!(overlay instanceof HTMLElement)) throw new Error("overlay not found");
    await userEvent.pointer({ keys: "[MouseLeft]", target: overlay });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes on an outside click by default", async () => {
    mockMatchMedia(true);
    const onOpenChange = vi.fn();
    render(
      <ResponsivePanel open onOpenChange={onOpenChange} title="Default close">
        <p>Body</p>
      </ResponsivePanel>,
    );

    const overlay = document.querySelector('[class*="bg-black/50"]');
    if (!(overlay instanceof HTMLElement)) throw new Error("overlay not found");
    await userEvent.pointer({ keys: "[MouseLeft]", target: overlay });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
