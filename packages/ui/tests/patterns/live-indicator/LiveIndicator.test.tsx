import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveIndicator } from "../../../src/patterns/live-indicator/LiveIndicator";

describe("LiveIndicator", () => {
  it("shows the formatted last update", () => {
    render(<LiveIndicator updatedAt={Date.UTC(2026, 0, 1, 12, 0, 5)} locale="en-GB" />);
    expect(screen.getByTestId("live-indicator")).toHaveAttribute("data-state", "live");
    expect(screen.getByTestId("live-indicator").textContent).toMatch(/Updated \d{2}:\d{2}:\d{2}/);
    expect(screen.getByTestId("status-dot-pulse")).toBeInTheDocument();
  });

  it("shows updating, paused and labels", () => {
    const { rerender } = render(<LiveIndicator updatedAt={1} fetching />);
    expect(screen.getByTestId("live-indicator")).toHaveTextContent("Updating…");
    rerender(<LiveIndicator updatedAt={1} paused intervalMs={5000} />);
    expect(screen.getByTestId("live-indicator")).toHaveAttribute("data-state", "paused");
    expect(screen.getByTestId("live-indicator")).toHaveAttribute("title", "Refreshes every 5 s");
    expect(screen.queryByTestId("status-dot-pulse")).toBeNull();
    rerender(<LiveIndicator paused labels={{ paused: "Pausiert" }} />);
    expect(screen.getByTestId("live-indicator")).toHaveTextContent("Pausiert");
  });

  it("is empty before the first load", () => {
    render(<LiveIndicator updatedAt={0} />);
    expect(screen.getByTestId("live-indicator").textContent).toBe("");
  });
});
