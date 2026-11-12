import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankBadge, ScoreBadge, resolveScoreTone } from "../../../src";

describe("resolveScoreTone", () => {
  it("switches at the threshold boundary", () => {
    expect(resolveScoreTone(84)).toBe("warning");
    expect(resolveScoreTone(85)).toBe("success");
  });
  it("ignores threshold order and falls back to neutral", () => {
    const t = [{ min: 90, tone: "success" as const }, { min: 50, tone: "warning" as const }];
    expect(resolveScoreTone(60, t)).toBe("warning");
    expect(resolveScoreTone(10, t)).toBe("neutral");
  });
});

describe("ScoreBadge", () => {
  it("renders a percentage", () => {
    render(<ScoreBadge value={92.4} />);
    expect(screen.getByText("92%")).toBeTruthy();
  });
  it("scales with max", () => {
    render(<ScoreBadge value={0.5} max={1} />);
    expect(screen.getByText("50%")).toBeTruthy();
  });
  it("rounds before picking the tone and clamps to 0–100", () => {
    render(<ScoreBadge value={84.6} data-testid="a" />);
    expect(screen.getByTestId("a").textContent).toBe("85%");
    expect(screen.getByTestId("a").className).toContain("emerald");
    render(<ScoreBadge value={140} data-testid="b" />);
    expect(screen.getByTestId("b").textContent).toBe("100%");
  });
  it("renders nothing for null", () => {
    const { container } = render(<ScoreBadge value={null} />);
    expect(container.firstChild).toBeNull();
  });
  it("supports tone override, custom format and hidden dot", () => {
    render(<ScoreBadge value={10} tone="success" format={(p) => `${p} pts`} showDot={false} data-testid="b" />);
    const badge = screen.getByTestId("b");
    expect(badge.textContent).toBe("10 pts");
    expect(badge.className).toContain("emerald");
    expect(badge.querySelector("span")).toBeNull();
  });
  it("marks the dot decorative", () => {
    render(<ScoreBadge value={90} data-testid="b" />);
    expect(screen.getByTestId("b").querySelector("span")?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("RankBadge", () => {
  it("shows the rank", () => {
    render(<RankBadge rank={3} />);
    expect(screen.getByText("3")).toBeTruthy();
  });
});
