import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Stepper } from "../../../src/patterns/stepper/Stepper";

const STEPS = [
  { id: "upload", label: "Upload" },
  { id: "match", label: "Match", description: "Capture" },
  { id: "review", label: "Review" },
  { id: "send", label: "Send" },
];

describe("Stepper", () => {
  it("marks the active step with aria-current and numbers the rest", () => {
    render(<Stepper steps={STEPS} activeStep="match" />);
    const nav = screen.getByRole("navigation", { name: "Progress" });
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(within(items[2]!).getByText("3")).toBeInTheDocument();
  });

  it("renders no buttons when onStepChange is omitted", () => {
    render(<Stepper steps={STEPS} activeStep="review" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("makes completed steps clickable and upcoming ones inert", () => {
    const onStepChange = vi.fn();
    render(<Stepper steps={STEPS} activeStep="review" onStepChange={onStepChange} mobile="full" />);
    fireEvent.click(screen.getByRole("button", { name: /Upload/ }));
    expect(onStepChange).toHaveBeenCalledWith("upload");
    expect(screen.queryByRole("button", { name: /Send/ })).not.toBeInTheDocument();
    // The active step is not a button either — clicking where you are is a no-op.
    expect(screen.queryByRole("button", { name: /Review/ })).not.toBeInTheDocument();
  });

  it("unlocks steps ahead up to furthestStep", () => {
    const onStepChange = vi.fn();
    render(<Stepper steps={STEPS} activeStep="upload" furthestStep="review" onStepChange={onStepChange} mobile="full" />);
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    expect(onStepChange).toHaveBeenCalledWith("review");
    expect(screen.queryByRole("button", { name: /Send/ })).not.toBeInTheDocument();
  });

  it("announces completed and unavailable steps to screen readers", () => {
    render(<Stepper steps={STEPS} activeStep="review" mobile="full" />);
    expect(screen.getAllByText("(completed)", { exact: false })).toHaveLength(2);
    expect(screen.getByText("(not yet available)", { exact: false })).toBeInTheDocument();
  });

  it("flags an error step", () => {
    render(<Stepper steps={[...STEPS.slice(0, 2), { id: "review", label: "Review", error: true }]} activeStep="upload" />);
    expect(screen.getByText("(needs attention)", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Review")).toHaveClass("text-destructive");
  });

  it("renders the compact phone counter for horizontal steppers", () => {
    render(<Stepper steps={STEPS} activeStep="match" />);
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
  });

  it("does not render the compact counter for vertical or mobile='full'", () => {
    const { rerender } = render(<Stepper steps={STEPS} activeStep="match" orientation="vertical" />);
    expect(screen.queryByText("Step 2 of 4")).not.toBeInTheDocument();
    rerender(<Stepper steps={STEPS} activeStep="match" mobile="full" />);
    expect(screen.queryByText("Step 2 of 4")).not.toBeInTheDocument();
  });

  it("uses a custom counter format", () => {
    render(<Stepper steps={STEPS} activeStep="send" formatCounter={(n, t) => `Schritt ${n}/${t}`} />);
    expect(screen.getByText("Schritt 4/4")).toBeInTheDocument();
  });

  it("shows step descriptions", () => {
    render(<Stepper steps={STEPS} activeStep="upload" orientation="vertical" />);
    expect(screen.getByText("Capture")).toBeInTheDocument();
  });
});
