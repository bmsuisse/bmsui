import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TypingIndicator } from "../../../src/patterns/typing-indicator/TypingIndicator";

describe("TypingIndicator", () => {
  it("is a status with a screen-reader label and three dots", () => {
    const { container } = render(<TypingIndicator />);
    expect(screen.getByRole("status")).toHaveTextContent("Assistant is typing");
    expect(container.querySelectorAll("[data-dot]")).toHaveLength(3);
    expect(screen.getByText("Assistant is typing")).toHaveClass("sr-only");
  });

  it("can show a custom label", () => {
    render(<TypingIndicator label="Schreibt…" showLabel />);
    expect(screen.getByText("Schreibt…")).not.toHaveClass("sr-only");
  });
});
