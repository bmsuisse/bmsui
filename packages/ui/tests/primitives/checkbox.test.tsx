import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../../src/primitives/checkbox";

describe("Checkbox", () => {
  it("shows a minus icon and aria-checked=mixed when indeterminate", () => {
    const { container } = render(<Checkbox checked="indeterminate" aria-label="all" />);
    const box = screen.getByRole("checkbox", { name: "all" });
    expect(box).toHaveAttribute("aria-checked", "mixed");
    expect(box).toHaveAttribute("data-state", "indeterminate");
    // MinusIcon is a single horizontal line, CheckIcon a polyline-like path
    expect(container.querySelector("svg path")?.getAttribute("d")).toBe("M5 12h14");
  });

  it("shows a check icon when checked", () => {
    const { container } = render(<Checkbox checked aria-label="one" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
    expect(container.querySelector("svg path")?.getAttribute("d")).not.toBe("M5 12h14");
  });
});
