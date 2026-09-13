import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfidenceIndicator } from "../../../src/patterns/ai/ConfidenceIndicator";

function filledCount(container: HTMLElement): number {
  return container.querySelectorAll('[data-filled="true"]').length;
}

describe("ConfidenceIndicator", () => {
  it("renders the high band: 3 filled bars, 'High' label", () => {
    const { container } = render(<ConfidenceIndicator value={0.9} testId="ci" />);
    expect(screen.getByTestId("ci")).toHaveAttribute("data-band", "high");
    expect(filledCount(container)).toBe(3);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders the medium band: 2 filled bars, 'Medium' label", () => {
    const { container } = render(<ConfidenceIndicator value={0.7} testId="ci" />);
    expect(screen.getByTestId("ci")).toHaveAttribute("data-band", "medium");
    expect(filledCount(container)).toBe(2);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders the low band: 1 filled bar, 'Low – check' label", () => {
    const { container } = render(<ConfidenceIndicator value={0.4} testId="ci" />);
    expect(screen.getByTestId("ci")).toHaveAttribute("data-band", "low");
    expect(filledCount(container)).toBe(1);
    expect(screen.getByText("Low – check")).toBeInTheDocument();
  });

  it.each([null, undefined, NaN])("renders the unknown band for %p: 0 filled bars, '—' label", (value) => {
    const { container } = render(<ConfidenceIndicator value={value} testId="ci" />);
    expect(screen.getByTestId("ci")).toHaveAttribute("data-band", "unknown");
    expect(filledCount(container)).toBe(0);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("respects custom thresholds", () => {
    render(<ConfidenceIndicator value={0.5} thresholds={{ high: 0.6, medium: 0.4 }} testId="ci" />);
    expect(screen.getByTestId("ci")).toHaveAttribute("data-band", "medium");
  });

  it("format='meter' renders bars only, no label text", () => {
    render(<ConfidenceIndicator value={0.9} format="meter" testId="ci" />);
    expect(screen.queryByText("High")).not.toBeInTheDocument();
  });

  it("format='label' renders the label only, no bars", () => {
    const { container } = render(<ConfidenceIndicator value={0.9} format="label" testId="ci" />);
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-filled]").length).toBe(0);
  });

  it("format='percent' renders the numeric percent", () => {
    render(<ConfidenceIndicator value={0.873} format="percent" testId="ci" />);
    expect(screen.getByText("87 %")).toBeInTheDocument();
  });

  it("default format='meter-label' renders both bars and label", () => {
    const { container } = render(<ConfidenceIndicator value={0.9} testId="ci" />);
    expect(filledCount(container)).toBe(3);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("the aria-label always contains the rounded percent, even when showPercent is false", () => {
    render(<ConfidenceIndicator value={0.873} testId="ci" />);
    expect(screen.getByTestId("ci")).toHaveAttribute("aria-label", "Confidence: high (87 %)");
  });

  it("showPercent appends the percent to the visible label", () => {
    render(<ConfidenceIndicator value={0.873} showPercent testId="ci" />);
    expect(screen.getByText("High · 87 %")).toBeInTheDocument();
  });

  it("accepts custom labels", () => {
    render(<ConfidenceIndicator value={0.9} labels={{ high: "Very sure" }} testId="ci" />);
    expect(screen.getByText("Very sure")).toBeInTheDocument();
  });
});
