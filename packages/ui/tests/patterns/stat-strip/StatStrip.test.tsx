import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatStrip, StatStripItem } from "../../../src/patterns/stat-strip/StatStrip";

describe("StatStrip", () => {
  it("renders a list of label/value cells", () => {
    render(
      <StatStrip aria-label="Metrics">
        <StatStripItem label="Queue" value={12} sub="+2" tone="danger" />
        <StatStripItem label="Errors" value={0} />
      </StatStrip>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Queue")).toBeInTheDocument();
    expect(screen.getByText("+2").className).toContain("text-red-700");
  });

  it("renders a link, a button and a loading skeleton", () => {
    const onClick = vi.fn();
    render(
      <StatStrip>
        <StatStripItem label="A" value={1} href="/a" />
        <StatStripItem label="B" value={2} onClick={onClick} />
        <StatStripItem label="C" value={3} loading />
      </StatStrip>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/a");
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("flashes only when the value changes, never on mount", () => {
    vi.useFakeTimers();
    const { rerender } = render(<StatStripItem label="A" value={1} />);
    expect(screen.getByText("1").className).not.toContain("bg-primary/15");
    rerender(<StatStripItem label="A" value={2} />);
    expect(screen.getByText("2").className).toContain("bg-primary/15");
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByText("2").className).not.toContain("bg-primary/15");
    rerender(<StatStripItem label="A" value={3} animated={false} />);
    expect(screen.getByText("3").className).not.toContain("bg-primary/15");
    vi.useRealTimers();
  });
});
