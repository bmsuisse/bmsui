import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../../src/primitives/checkbox";

// jsdom applies no CSS, so the dash vs check is asserted through the Indicator's own
// data-state (what the `group-data-[state=indeterminate]` classes key off) and the classes
// on each icon.
const icons = (container: HTMLElement) => {
  const svgs = Array.from(container.querySelectorAll("svg"));
  const check = svgs[0];
  const minus = svgs[1];
  if (!check || !minus) throw new Error("expected both the check and the minus icon to be rendered");
  return { check, minus };
};

describe("Checkbox", () => {
  it("shows the dash and aria-checked=mixed when controlled indeterminate", () => {
    const { container } = render(<Checkbox checked="indeterminate" aria-label="all" />);
    const box = screen.getByRole("checkbox", { name: "all" });
    expect(box).toHaveAttribute("aria-checked", "mixed");
    expect(container.querySelector("[data-state=indeterminate] svg")).not.toBeNull();
    const { check, minus } = icons(container);
    expect(check.getAttribute("class")).toContain("group-data-[state=indeterminate]:hidden");
    expect(minus.getAttribute("class")).toContain("group-data-[state=indeterminate]:block");
    expect(minus.querySelector("path")?.getAttribute("d")).toBe("M5 12h14");
  });

  it("shows the dash for an uncontrolled defaultChecked=indeterminate, then a check once clicked", () => {
    const { container } = render(<Checkbox defaultChecked="indeterminate" aria-label="mixed" />);
    const box = screen.getByRole("checkbox", { name: "mixed" });
    expect(box).toHaveAttribute("aria-checked", "mixed");
    // the Indicator carries the state the icon classes select on
    expect(container.querySelector("span[data-state=indeterminate]")).not.toBeNull();
    fireEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(container.querySelector("span[data-state=checked]")).not.toBeNull();
    expect(container.querySelector("span[data-state=indeterminate]")).toBeNull();
  });

  it("renders the check icon when checked", () => {
    const { container } = render(<Checkbox checked aria-label="one" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
    expect(container.querySelector("span[data-state=checked]")).not.toBeNull();
    expect(icons(container).check.querySelector("path")?.getAttribute("d")).not.toBe("M5 12h14");
  });
});
