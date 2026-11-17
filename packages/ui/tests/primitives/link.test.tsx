import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Link } from "../../src/primitives/link";

describe("Link", () => {
  it("renders an anchor", () => {
    render(<Link href="/orders">Orders</Link>);
    const a = screen.getByRole("link", { name: "Orders" });
    expect(a).toHaveAttribute("href", "/orders");
    expect(a).not.toHaveAttribute("target");
    expect(a).not.toHaveAttribute("rel");
  });

  it("external opens a new tab safely and announces it", () => {
    render(
      <Link href="https://example.com" external rel="author">
        Docs
      </Link>,
    );
    const a = screen.getByRole("link", { name: "Docs (opens in new tab)" });
    expect(a).toHaveAttribute("target", "_blank");
    expect(a.getAttribute("rel")?.split(" ").sort()).toEqual(["author", "noopener", "noreferrer"]);
    expect(a.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("takes translated labels", () => {
    render(
      <Link href="https://example.com" external labels={{ newTab: "(öffnet in neuem Tab)" }}>
        Doku
      </Link>,
    );
    expect(screen.getByRole("link", { name: "Doku (öffnet in neuem Tab)" })).toBeInTheDocument();
  });

  it("asChild puts the link styling, external props and icon on the child", () => {
    const Router = ({ to, children, ...rest }: { to: string; children?: React.ReactNode }) => (
      <a href={to} data-router="1" {...rest}>
        {children}
      </a>
    );
    render(
      <Link asChild external variant="subtle">
        <Router to="/x">Orders</Router>
      </Link>,
    );
    const a = screen.getByRole("link", { name: "Orders (opens in new tab)" });
    expect(a).toHaveAttribute("data-router", "1");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a.className).toContain("text-muted-foreground");
    expect(a.querySelector("svg")).not.toBeNull();
  });

  it("variants and className", () => {
    render(
      <Link href="#" variant="inline" className="custom">
        in text
      </Link>,
    );
    const a = screen.getByRole("link");
    expect(a.className).toContain("underline");
    expect(a.className).toContain("custom");
  });
});
