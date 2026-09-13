import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiMarker } from "../../../src/patterns/ai/AiMarker";

describe("AiMarker", () => {
  it("renders the default 'AI' label", () => {
    render(<AiMarker />);
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("renders a custom label", () => {
    render(<AiMarker label="Extracting…" />);
    expect(screen.getByText("Extracting…")).toBeInTheDocument();
  });

  it("sets role=status when pulsing", () => {
    render(<AiMarker pulse label="Extracting…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Extracting…");
  });

  it("has no status role when not pulsing", () => {
    render(<AiMarker />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the chip variant with a tinted background class", () => {
    render(<AiMarker variant="chip" />);
    const el = screen.getByText("AI").parentElement!;
    expect(el.className).toContain("rounded-full");
  });

  it("renders the inline variant without the chip's rounded-full class", () => {
    render(<AiMarker variant="inline" />);
    const el = screen.getByText("AI").parentElement!;
    expect(el.className).not.toContain("rounded-full");
  });

  it("merges a custom className", () => {
    render(<AiMarker className="custom-class" />);
    const el = screen.getByText("AI").parentElement!;
    expect(el).toHaveClass("custom-class");
  });

  it("suppresses role=status when decorative, even while pulsing", () => {
    render(<AiMarker pulse decorative label="Extracting…" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("sets aria-hidden when decorative", () => {
    render(<AiMarker decorative />);
    const el = screen.getByText("AI").parentElement!;
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
});
