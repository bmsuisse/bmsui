import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumbs } from "../../../src/patterns/breadcrumbs/Breadcrumbs";

const items = [
  { label: "Home", href: "/" },
  { label: "Customers", href: "/customers" },
  { label: "West", href: "/customers/west" },
  { label: "Zürich", href: "/customers/west/zh" },
  { label: "Müller AG" },
];

describe("Breadcrumbs", () => {
  it("renders nav > ol with the last item as the current page", () => {
    render(<Breadcrumbs items={items.slice(0, 3).concat(items[4]!)} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav.querySelector("ol")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    const current = screen.getByText("Müller AG").closest("[aria-current]");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Müller AG" })).toBeNull();
  });

  it("collapses the middle into a … menu past maxItems", async () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getAllByTestId("breadcrumbs-item")).toHaveLength(3);
    expect(screen.queryByText("Customers")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Show hidden breadcrumbs" }));
    expect(await screen.findByRole("menuitem", { name: "Customers" })).toHaveAttribute("href", "/customers");
    expect(screen.getByRole("menuitem", { name: "West" })).toBeInTheDocument();
  });

  it("does not collapse when maxItems allows all", () => {
    render(<Breadcrumbs items={items} maxItems={10} />);
    expect(screen.getAllByTestId("breadcrumbs-item")).toHaveLength(5);
    expect(screen.queryByTestId("breadcrumbs-more")).toBeNull();
  });

  it("uses renderLink, onClick items, custom separator and labels", () => {
    const onClick = vi.fn();
    render(
      <Breadcrumbs
        items={[{ label: "Root", onClick }, { label: "A", href: "/a" }, { label: "B" }]}
        renderLink={({ href, className, children }) => (
          <span data-router-link={href} className={className}>
            {children}
          </span>
        )}
        separator="/"
        labels={{ nav: "Pfad" }}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Pfad" })).toBeInTheDocument();
    expect(screen.getByText("A").closest("[data-router-link]")).toHaveAttribute("data-router-link", "/a");
    fireEvent.click(screen.getByRole("button", { name: "Root" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getAllByText("/")).toHaveLength(2);
  });
});
