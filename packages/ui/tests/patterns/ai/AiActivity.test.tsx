import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AiActivity, type AiActivityStep } from "../../../src/patterns/ai/AiActivity";

describe("AiActivity", () => {
  it("renders idleLabel while running with no active step", () => {
    render(<AiActivity status="running" idleLabel="Thinking…" />);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("renders the running step's label instead of idleLabel", () => {
    const steps: AiActivityStep[] = [{ id: "1", label: "Searching docs", status: "running" }];
    render(<AiActivity status="running" idleLabel="Thinking…" steps={steps} />);
    expect(screen.getByText("Searching docs")).toBeInTheDocument();
    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
  });

  it("has role=status while running, absent when done", () => {
    const { rerender } = render(<AiActivity status="running" idleLabel="x" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<AiActivity status="done" steps={[{ id: "1", label: "Done step", status: "done" }]} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a disclosure toggle for more than one step; clicking expands and fires onExpandedChange", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    const steps: AiActivityStep[] = [
      { id: "1", label: "Step one", status: "done" },
      { id: "2", label: "Step two", status: "done" },
    ];
    render(<AiActivity status="done" steps={steps} onExpandedChange={onExpandedChange} />);
    const toggle = screen.getByRole("button", { name: /1 more/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("Step two")).toBeVisible();
  });

  it("renders no toggle for a single step", () => {
    render(<AiActivity status="done" steps={[{ id: "1", label: "Only step", status: "done" }]} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("auto-expands when a step is denied", () => {
    const steps: AiActivityStep[] = [
      { id: "1", label: "Step one", status: "done" },
      { id: "2", label: "Blocked step", status: "denied" },
    ];
    render(<AiActivity status="done" steps={steps} />);
    expect(screen.getByRole("button", { name: /1 more/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Blocked step")).toBeVisible();
  });

  it("auto-expands when a step is interrupted", () => {
    const steps: AiActivityStep[] = [
      { id: "1", label: "Step one", status: "done" },
      { id: "2", label: "Cut off step", status: "interrupted" },
    ];
    render(<AiActivity status="done" steps={steps} />);
    expect(screen.getByRole("button", { name: /1 more/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("a failed step renders destructive styling and accessible 'Failed' text, not colour alone", () => {
    const steps: AiActivityStep[] = [
      { id: "1", label: "Step one", status: "done" },
      { id: "2", label: "Broken step", status: "failed" },
    ];
    render(<AiActivity status="done" steps={steps} defaultExpanded />);
    const failedTexts = screen.getAllByText("Failed");
    expect(failedTexts.length).toBeGreaterThan(0);
    const brokenLabel = screen.getByText("Broken step");
    expect(brokenLabel).toHaveClass("text-destructive");
  });

  it("a denied step renders the amber classes and 'Denied' text", () => {
    const steps: AiActivityStep[] = [
      { id: "1", label: "Step one", status: "done" },
      { id: "2", label: "Blocked step", status: "denied" },
    ];
    render(<AiActivity status="done" steps={steps} defaultExpanded />);
    expect(screen.getAllByText("Denied").length).toBeGreaterThan(0);
    const blockedLabel = screen.getByText("Blocked step");
    expect(blockedLabel).toHaveClass("text-amber-700");
    expect(blockedLabel).toHaveClass("dark:text-amber-300");
  });

  it("controlled expanded wins over the auto-expand default", () => {
    const steps: AiActivityStep[] = [
      { id: "1", label: "Step one", status: "done" },
      { id: "2", label: "Blocked step", status: "denied" },
    ];
    render(<AiActivity status="done" steps={steps} expanded={false} />);
    expect(screen.getByRole("button", { name: /1 more/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("glyph replaces the default marker", () => {
    render(<AiActivity status="running" idleLabel="x" glyph={<span data-testid="custom-glyph">*</span>} />);
    expect(screen.getByTestId("custom-glyph")).toBeInTheDocument();
  });

  it("the nested AiMarker does not create a second role=status while running", () => {
    render(<AiActivity status="running" idleLabel="x" />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("renders percent", () => {
    const steps: AiActivityStep[] = [{ id: "1", label: "Uploading", status: "running", percent: 42 }];
    render(<AiActivity status="running" steps={steps} />);
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("forwards ref, merges className, and applies testId", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AiActivity ref={ref} status="running" idleLabel="x" className="custom-class" testId="activity" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("custom-class");
    expect(screen.getByTestId("activity")).toBe(ref.current);
  });
});
