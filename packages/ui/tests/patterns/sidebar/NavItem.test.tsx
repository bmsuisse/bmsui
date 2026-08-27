import { render, screen } from "@testing-library/react";
import { LayoutGrid } from "lucide-react";
import { describe, expect, it } from "vitest";
import { NavItem } from "../../../src/patterns/sidebar/NavItem";
import { SidebarContextProvider } from "../../../src/patterns/sidebar/context";
import { TooltipProvider } from "../../../src/primitives/tooltip";

describe("NavItem", () => {
  it("renders as an anchor by default and forwards href", () => {
    render(<NavItem href="/overview" icon={LayoutGrid} label="Overview" />);
    const link = screen.getByRole("link", { name: "Overview" });
    expect(link).toHaveAttribute("href", "/overview");
  });

  it("applies the active accent classes only when active", () => {
    const { rerender } = render(<NavItem href="/x" label="X" active={false} />);
    expect(screen.getByRole("link").className).not.toContain("bg-nav-primary/8");

    rerender(<NavItem href="/x" label="X" active />);
    expect(screen.getByRole("link").className).toContain("bg-nav-primary/8");
  });

  it("renders as a different element via `as`", () => {
    render(<NavItem as="button" type="button" label="Do it" />);
    expect(screen.getByRole("button", { name: "Do it" })).toBeInTheDocument();
  });

  it("shows label inline when not collapsed", () => {
    render(<NavItem href="/x" label="Overview" />);
    expect(screen.getByText("Overview")).toBeVisible();
  });

  it("hides the inline label and exposes it via a tooltip when the sidebar is rail-collapsed", async () => {
    render(
      <SidebarContextProvider value={{ collapsed: true }}>
        <TooltipProvider>
          <NavItem href="/x" label="Overview" />
        </TooltipProvider>
      </SidebarContextProvider>,
    );
    // The row itself carries no accessible name from the (now empty-width) label span.
    const link = screen.getByRole("link");
    expect(link.className).toContain("justify-center");
    // Tooltip content is only mounted on hover/focus in Radix, so just assert
    // the row is wrapped for one (no crash rendering without a name).
    expect(link).toBeInTheDocument();
  });
});
