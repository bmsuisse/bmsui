import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageHeader } from "../../../src/patterns/page-header/PageHeader";

describe("PageHeader", () => {
  it("renders title as h1, description, actions and the OneSales test ids", () => {
    render(<PageHeader title="Offers" description="All offers" actions={<button>New</button>} badge="beta" />);
    expect(screen.getByRole("heading", { level: 1, name: "Offers" })).toHaveAttribute("data-testid", "page-header-title");
    expect(screen.getByTestId("page-header-description")).toHaveTextContent("All offers");
    expect(screen.getByTestId("page-header-actions")).toContainElement(screen.getByRole("button", { name: "New" }));
    expect(screen.getByTestId("page-header-badge")).toHaveTextContent("beta");
  });

  it("onBack renders a back button with a translatable label", () => {
    const onBack = vi.fn();
    render(<PageHeader title="Detail" onBack={onBack} labels={{ back: "Zurück" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("backHref renders a link", () => {
    render(<PageHeader title="Detail" backHref="/list" />);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/list");
  });

  it("renders breadcrumbs and tabs slots, custom heading level and className", () => {
    render(
      <PageHeader
        title="T"
        titleAs="h2"
        breadcrumbs={<nav>crumbs</nav>}
        tabs={<div>tabs</div>}
        className="custom"
      />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getByText("crumbs")).toBeInTheDocument();
    expect(screen.getByTestId("page-header-tabs")).toHaveTextContent("tabs");
    expect(screen.getByTestId("page-header")).toHaveClass("custom");
    expect(screen.queryByTestId("page-header-back")).toBeNull();
  });
});
