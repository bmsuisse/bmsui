import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircularProgress, ProgressBar } from "../../../src/patterns/progress/ProgressBar";

describe("ProgressBar", () => {
  it("exposes aria values and labels the bar with its label", () => {
    render(<ProgressBar value={42} label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuetext", "42%");
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("clamps and scales against max, with a custom formatter", () => {
    render(<ProgressBar value={30} max={20} label="Files" formatValue={(v, m) => `${v} of ${m}`} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "20");
    expect(bar).toHaveAttribute("data-state", "complete");
    expect(screen.getByText("30 of 20")).toBeInTheDocument();
    expect((bar.firstChild as HTMLElement).style.width).toBe("100%");
  });

  it("is indeterminate without a value: no aria-valuenow, busy, no value text", () => {
    render(<ProgressBar label="Syncing" />);
    const bar = screen.getByRole("progressbar", { name: "Syncing" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("aria-busy", "true");
    expect(bar).toHaveAttribute("data-state", "indeterminate");
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("takes aria-label when there is no visible label, and applies tone and size", () => {
    render(<ProgressBar value={10} aria-label="Quota" tone="warning" size="lg" />);
    const bar = screen.getByRole("progressbar", { name: "Quota" });
    expect(bar.className).toContain("h-3");
    expect((bar.firstChild as HTMLElement).className).toContain("bg-amber-500");
    expect(screen.queryByText("10%")).toBeNull();
  });
});

describe("CircularProgress", () => {
  it("renders a determinate ring with value text", () => {
    render(<CircularProgress value={75} aria-label="Import" showValue size={40} />);
    const ring = screen.getByRole("progressbar", { name: "Import" });
    expect(ring).toHaveAttribute("aria-valuenow", "75");
    expect(ring).toHaveTextContent("75%");
    expect(ring.style.width).toBe("40px");
  });

  it("spins when indeterminate", () => {
    render(<CircularProgress aria-label="Loading" />);
    const ring = screen.getByRole("progressbar", { name: "Loading" });
    expect(ring).not.toHaveAttribute("aria-valuenow");
    expect(ring.querySelector("svg")?.getAttribute("class")).toContain("animate-spin");
  });
});
