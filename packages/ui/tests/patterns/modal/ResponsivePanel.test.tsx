import { render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("dialog")).toHaveClass("max-w-4xl");
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
});
