import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SkipLinks } from "../../../src/patterns/skip-links/SkipLinks";

describe("SkipLinks", () => {
  it("renders a labelled nav with anchors and buttons, first in tab order", async () => {
    const onSelect = vi.fn();
    render(
      <>
        <SkipLinks label="Springe zu" links={[{ label: "Main", href: "#main" }, { label: "Search", onSelect }]} />
        <button>Other</button>
      </>,
    );
    expect(screen.getByRole("navigation", { name: "Springe zu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Main" })).toHaveAttribute("href", "#main");
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Main" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSelect).toHaveBeenCalled();
  });

  it("is visually hidden until focused", () => {
    render(<SkipLinks links={[{ label: "Main", href: "#main" }]} />);
    expect(screen.getByRole("link").className).toContain("sr-only");
    expect(screen.getByRole("link").className).toContain("focus-visible:not-sr-only");
  });
});
