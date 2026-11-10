import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusDot } from "../../../src/patterns/status-dot/StatusDot";

describe("StatusDot", () => {
  it("resolves a status like StatusBadge and derives the label", () => {
    render(<StatusDot status="in_review" />);
    const dot = screen.getByTestId("status-dot");
    expect(dot).toHaveAttribute("data-tone", "warning");
    expect(dot).toHaveTextContent("In Review");
    expect(dot.querySelector(".bg-amber-500")).not.toBeNull();
  });

  it("takes an explicit tone and label, and can hide the label visually", () => {
    render(<StatusDot tone="success" label="Online" hideLabel pulse />);
    const dot = screen.getByTestId("status-dot");
    expect(dot).toHaveAttribute("data-tone", "success");
    expect(screen.getByText("Online")).toHaveClass("sr-only");
    expect(dot.querySelector(".animate-ping")).not.toBeNull();
  });

  it("uses a caller toneMap and falls back to neutral", () => {
    const { rerender } = render(<StatusDot status="offen" toneMap={{ OFFEN: "info" }} />);
    expect(screen.getByTestId("status-dot")).toHaveAttribute("data-tone", "info");
    rerender(<StatusDot status="whatever" />);
    expect(screen.getByTestId("status-dot")).toHaveAttribute("data-tone", "neutral");
  });
});
