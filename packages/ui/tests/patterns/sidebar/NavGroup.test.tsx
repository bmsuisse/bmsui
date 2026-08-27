import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavGroup } from "../../../src/patterns/sidebar/NavGroup";
import { SidebarContextProvider } from "../../../src/patterns/sidebar/context";

describe("NavGroup", () => {
  it("renders its children by default", () => {
    render(
      <NavGroup label="Work">
        <div>Overview</div>
      </NavGroup>,
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("starts collapsed when defaultCollapsed is set, and toggles on header click", () => {
    render(
      <NavGroup label="Work" defaultCollapsed>
        <div>Overview</div>
      </NavGroup>,
    );
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Work" }));
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("is fully controlled when collapsed/onCollapsedChange are both given", () => {
    const onCollapsedChange = vi.fn();
    render(
      <NavGroup label="Work" collapsed={false} onCollapsedChange={onCollapsedChange}>
        <div>Overview</div>
      </NavGroup>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Work" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    // Still expanded — the parent didn't feed the new value back in.
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("renders no header at all when label is omitted", () => {
    render(
      <NavGroup>
        <div>Overview</div>
      </NavGroup>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("collapses the header to a divider (not a button) when the sidebar is rail-collapsed, while keeping items visible", () => {
    const { container } = render(
      <SidebarContextProvider value={{ collapsed: true }}>
        <NavGroup label="Work">
          <div>Overview</div>
        </NavGroup>
      </SidebarContextProvider>,
    );
    expect(screen.queryByRole("button", { name: "Work" })).not.toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });
});
