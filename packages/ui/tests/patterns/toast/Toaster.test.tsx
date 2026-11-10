import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "../../../src/patterns/toast/Toaster";
import { MAX_TOASTS, resetToasts, TOAST_EXIT_MS, toast } from "../../../src/patterns/toast/toastStore";

beforeEach(() => {
  vi.useFakeTimers();
  resetToasts();
});

afterEach(() => {
  act(() => resetToasts());
  vi.useRealTimers();
});

// jsdom has no PointerEvent, so fireEvent drops `pointerType`. React derives
// onPointerEnter/Leave from pointerover/pointerout; dispatch those with the field set.
const pointer = (el: Element, type: "pointerover" | "pointerout", pointerType: string) => {
  const event = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  act(() => {
    el.dispatchEvent(event);
  });
};

describe("Toaster", () => {
  it("renders a queued toast in a labelled region", () => {
    render(<Toaster />);
    act(() => {
      toast("Saved", { description: "All changes stored" });
    });
    expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Notifications" })).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("toast")).toHaveTextContent("Saved");
    expect(screen.getByText("All changes stored")).toBeInTheDocument();
  });

  it("errors use role=alert and stay longer", () => {
    render(<Toaster />);
    act(() => {
      toast.error("Upload failed");
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Upload failed");
    act(() => vi.advanceTimersByTime(4000 + TOAST_EXIT_MS));
    expect(screen.queryByText("Upload failed")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000 + TOAST_EXIT_MS));
    expect(screen.queryByText("Upload failed")).not.toBeInTheDocument();
  });

  it("auto-dismisses after its duration", () => {
    render(<Toaster />);
    act(() => {
      toast.success("Done", { duration: 1000 });
    });
    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByText("Done")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1 + TOAST_EXIT_MS));
    expect(screen.queryByText("Done")).not.toBeInTheDocument();
  });

  it("pauses while hovered", () => {
    render(<Toaster />);
    act(() => {
      toast("Hover me", { duration: 1000 });
    });
    act(() => vi.advanceTimersByTime(500));
    pointer(screen.getByTestId("toast"), "pointerover", "mouse");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("Hover me")).toBeInTheDocument();
    pointer(screen.getByTestId("toast"), "pointerout", "mouse");
    act(() => vi.advanceTimersByTime(500 + TOAST_EXIT_MS));
    expect(screen.queryByText("Hover me")).not.toBeInTheDocument();
  });

  it("Infinity duration stays until dismissed", () => {
    render(<Toaster />);
    act(() => {
      toast("Sticky", { duration: Infinity });
    });
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText("Sticky")).toBeInTheDocument();
    expect(screen.queryByTestId("toast-progress")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    act(() => vi.advanceTimersByTime(TOAST_EXIT_MS));
    expect(screen.queryByText("Sticky")).not.toBeInTheDocument();
  });

  it("runs the action and dismisses", () => {
    const undo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Deleted", { action: { label: "Undo", onClick: undo } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(undo).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(TOAST_EXIT_MS));
    expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
  });

  it(`keeps at most ${MAX_TOASTS}, dropping the oldest`, () => {
    render(<Toaster />);
    act(() => {
      for (const n of [1, 2, 3, 4]) toast(`T${n}`);
    });
    act(() => vi.advanceTimersByTime(TOAST_EXIT_MS));
    expect(screen.getAllByTestId("toast")).toHaveLength(MAX_TOASTS);
    expect(screen.queryByText("T1")).not.toBeInTheDocument();
    expect(screen.getByText("T4")).toBeInTheDocument();
  });

  it("toast.dismiss() without id clears all; returns ids", () => {
    render(<Toaster labels={{ region: "Meldungen" }} />);
    let id = 0;
    act(() => {
      id = toast("A");
      toast("B");
    });
    expect(typeof id).toBe("number");
    act(() => toast.dismiss());
    act(() => vi.advanceTimersByTime(TOAST_EXIT_MS));
    expect(screen.queryAllByTestId("toast")).toHaveLength(0);
    expect(screen.getByRole("region", { name: "Meldungen" })).toBeInTheDocument();
  });

  it("evicts timed toasts before sticky ones", () => {
    render(<Toaster />);
    act(() => {
      toast.error("Sticky error", { duration: Infinity });
      for (const n of [1, 2, 3]) toast(`T${n}`);
    });
    act(() => vi.advanceTimersByTime(TOAST_EXIT_MS));
    expect(screen.getByText("Sticky error")).toBeInTheDocument();
    expect(screen.queryByText("T1")).not.toBeInTheDocument();
  });

  it("an action can't fire twice while the toast is leaving", () => {
    const undo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Deleted", { action: { label: "Undo", onClick: undo } });
    });
    const button = screen.getByRole("button", { name: "Undo" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(undo).toHaveBeenCalledOnce();
  });

  it("stays paused while focused even after the mouse leaves", () => {
    render(<Toaster />);
    act(() => {
      toast("Focus me", { duration: 1000 });
    });
    const card = screen.getByTestId("toast");
    pointer(card, "pointerover", "mouse");
    fireEvent.focus(screen.getByRole("button", { name: "Dismiss" }));
    pointer(card, "pointerout", "mouse");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("Focus me")).toBeInTheDocument();
  });

  it("touch taps don't pause", () => {
    render(<Toaster />);
    act(() => {
      toast("Tap", { duration: 1000 });
    });
    pointer(screen.getByTestId("toast"), "pointerover", "touch");
    act(() => vi.advanceTimersByTime(1000 + TOAST_EXIT_MS));
    expect(screen.queryByText("Tap")).not.toBeInTheDocument();
  });
});
