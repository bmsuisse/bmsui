import { HomeIcon, UsersIcon } from "@heroicons/react/24/outline";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BottomNavigation, BottomNavigationAction } from "../../../src/patterns/bottom-navigation/BottomNavigation";

const items = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "people", label: "People", icon: UsersIcon, badge: 120 },
  { id: "off", label: "Off", icon: HomeIcon, disabled: true },
];

describe("BottomNavigation", () => {
  it("marks the current item with aria-current and labels the nav", () => {
    render(<BottomNavigation aria-label="Main" items={items} value="home" position="static" />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Home/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /People/ })).not.toHaveAttribute("aria-current");
  });

  it("caps badge counts and gives them a screen-reader name", () => {
    render(<BottomNavigation aria-label="Main" items={items} value="home" />);
    expect(screen.getByText("99+")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /People.*120 new/ })).toBeInTheDocument();
  });

  it("calls onValueChange and works uncontrolled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BottomNavigation aria-label="Main" items={items} defaultValue="home" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: /People/ }));
    expect(onValueChange).toHaveBeenCalledWith("people");
    expect(screen.getByRole("button", { name: /People/ })).toHaveAttribute("aria-current", "page");
  });

  it("does not fire for disabled items", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BottomNavigation aria-label="Main" items={items} value="home" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: /Off/ }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("renders links for items with href, through renderLink when given", () => {
    render(
      <BottomNavigation
        aria-label="Main"
        items={[{ id: "a", label: "A", icon: HomeIcon, href: "/a" }]}
        value="a"
        renderLink={({ href, className, children, item: _item, ...rest }) => (
          <a data-router href={href} className={className} aria-current={rest["aria-current"]}>
            {children}
          </a>
        )}
      />,
    );
    const link = screen.getByRole("link", { name: "A" });
    expect(link).toHaveAttribute("data-router");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("puts the action in the centre and applies position/hideFrom", () => {
    render(
      <BottomNavigation
        aria-label="Main"
        items={items.slice(0, 2)}
        value="home"
        hideFrom="md"
        position="sticky"
        action={<BottomNavigationAction icon={HomeIcon} label="Add" />}
      />,
    );
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("md:hidden");
    expect(nav.className).toContain("sticky");
    expect(nav.className).toContain("pb-[env(safe-area-inset-bottom)]");
    const labels = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(labels).toEqual(["Home", "", "99+People120 new"]);
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
