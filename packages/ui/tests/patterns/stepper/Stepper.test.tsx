import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Stepper, type StepperStep } from "../../../src/patterns/stepper/Stepper";

const steps: StepperStep[] = [
  { n: 1, label: "Upload", phase: "intake" },
  { n: 2, label: "Review", phase: "capture" },
  { n: 3, label: "Match", phase: "process" },
  { n: 4, label: "Confirm", phase: "finish" },
];

describe("Stepper", () => {
  it("renders all steps with their labels and phases", () => {
    render(<Stepper step={2} maxStep={2} onNavigate={() => {}} steps={steps} />);
    for (const s of steps) {
      expect(screen.getByTestId(`step-${s.n}`)).toBeInTheDocument();
      expect(screen.getByText(s.label)).toBeInTheDocument();
      expect(screen.getByText(s.phase)).toBeInTheDocument();
    }
  });

  it("marks the current step with aria-current", () => {
    render(<Stepper step={2} maxStep={3} onNavigate={() => {}} steps={steps} />);
    expect(screen.getByTestId("step-2")).toHaveAttribute("aria-current", "step");
    expect(screen.getByTestId("step-1")).not.toHaveAttribute("aria-current");
    expect(screen.getByTestId("step-3")).not.toHaveAttribute("aria-current");
  });

  it("navigates to a step that is <= maxStep and not the current step", () => {
    const onNavigate = vi.fn();
    render(<Stepper step={2} maxStep={3} onNavigate={onNavigate} steps={steps} />);
    fireEvent.click(screen.getByTestId("step-3"));
    expect(onNavigate).toHaveBeenCalledWith(3);
  });

  it("does not navigate to a step beyond maxStep", () => {
    const onNavigate = vi.fn();
    render(<Stepper step={2} maxStep={2} onNavigate={onNavigate} steps={steps} />);
    fireEvent.click(screen.getByTestId("step-3"));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not navigate to the current step even though it is <= maxStep", () => {
    const onNavigate = vi.fn();
    render(<Stepper step={2} maxStep={3} onNavigate={onNavigate} steps={steps} />);
    fireEvent.click(screen.getByTestId("step-2"));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("renders a completed step with its check icon instead of its number", () => {
    render(<Stepper step={3} maxStep={3} onNavigate={() => {}} steps={steps} />);
    const doneStep = screen.getByTestId("step-1");
    expect(doneStep.querySelector("svg")).toBeInTheDocument();
    expect(doneStep).not.toHaveTextContent("1");

    const activeStep = screen.getByTestId("step-3");
    expect(activeStep.querySelector("svg")).not.toBeInTheDocument();
    expect(activeStep).toHaveTextContent("3");
  });

  it("renders the new button with the given label and test id when onNew is passed", () => {
    const onNew = vi.fn();
    render(
      <Stepper
        step={1}
        maxStep={1}
        onNavigate={() => {}}
        steps={steps}
        onNew={onNew}
        newLabel="Start over"
        newTestId="stepper-new"
      />,
    );
    const button = screen.getByRole("button", { name: "Start over" });
    expect(screen.getByTestId("stepper-new")).toBe(button);
    fireEvent.click(button);
    expect(onNew).toHaveBeenCalled();
  });

  it("omits the new button entirely when onNew is not passed", () => {
    render(<Stepper step={1} maxStep={1} onNavigate={() => {}} steps={steps} />);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });
});
