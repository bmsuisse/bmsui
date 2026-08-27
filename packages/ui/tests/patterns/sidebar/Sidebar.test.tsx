import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavItem } from "../../../src/patterns/sidebar/NavItem";
import { Sidebar, SidebarNav } from "../../../src/patterns/sidebar/Sidebar";

describe("Sidebar", () => {
  it("renders header, children, and footer", () => {
    render(
      <Sidebar header="Logo" footer="Footer">
        <div>Nav content</div>
      </Sidebar>,
    );
    expect(screen.getByText("Logo")).toBeInTheDocument();
    expect(screen.getByText("Nav content")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("resolves a function header/footer with the current collapsed state", () => {
    render(
      <Sidebar collapsed header={(collapsed) => (collapsed ? "D" : "Demo")}>
        <div />
      </Sidebar>,
    );
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.queryByText("Demo")).not.toBeInTheDocument();
  });

  it("shows a collapse toggle only when onCollapsedChange is given, and calls it with the flipped state", () => {
    const onCollapsedChange = vi.fn();
    render(
      <Sidebar collapsed={false} onCollapsedChange={onCollapsedChange} header="Logo">
        <div />
      </Sidebar>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("renders at the rail width when collapsed", () => {
    const { container } = render(
      <Sidebar collapsed railWidth={56}>
        <div />
      </Sidebar>,
    );
    const aside = container.querySelector("aside");
    expect(aside).toHaveStyle({ width: "56px" });
  });

  it("passes rail-collapsed context down to a NavItem child, hiding its inline label", () => {
    render(
      <Sidebar collapsed>
        <NavItem href="/x" label="Overview" />
      </Sidebar>,
    );
    expect(screen.getByRole("link").className).toContain("justify-center");
  });

  it("uses the double-click reset target as the default width", () => {
    const { container } = render(
      <Sidebar defaultWidth={240}>
        <div />
      </Sidebar>,
    );
    const aside = container.querySelector("aside");
    expect(aside).toHaveStyle({ width: "240px" });
  });
});

describe("SidebarNav", () => {
  it("renders children in a scrollable container", () => {
    render(
      <SidebarNav>
        <div>Item</div>
      </SidebarNav>,
    );
    expect(screen.getByText("Item")).toBeInTheDocument();
  });
});
