import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuotedText } from "../../../src/patterns/quoted-text/QuotedText";

describe("QuotedText", () => {
  it("is closed by default and toggles", () => {
    render(<QuotedText>Am 14.11.2026 schrieb Anna</QuotedText>);
    const btn = screen.getByRole("button", { name: "Show quoted text" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    const open = screen.getByRole("button", { name: "Hide quoted text" });
    expect(open).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(open.getAttribute("aria-controls") as string)).toHaveTextContent("Anna");
  });
  it("supports defaultOpen and controlled mode", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <QuotedText open={false} onOpenChange={onOpenChange}>
        x
      </QuotedText>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    rerender(
      <QuotedText open onOpenChange={onOpenChange}>
        x
      </QuotedText>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    render(<QuotedText defaultOpen labels={{ hide: "Ausblenden" }}>y</QuotedText>);
    expect(screen.getByRole("button", { name: "Ausblenden" })).toBeInTheDocument();
  });
});
