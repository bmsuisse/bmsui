import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Citation, SourceList, getSourceDomain } from "../../../src/patterns/citation/Citation";

const source = { url: "https://www.bfs.admin.ch/stats", title: "Federal Statistics" };

describe("getSourceDomain", () => {
  it("strips www and falls back to the raw text", () => {
    expect(getSourceDomain(source)).toBe("bfs.admin.ch");
    expect(getSourceDomain({ url: "not a url" })).toBe("not a url");
    expect(getSourceDomain({ url: "https://a.b", domain: "custom" })).toBe("custom");
  });
});

describe("Citation", () => {
  it("links to the source in a new tab", () => {
    render(<Citation index={2} source={source} />);
    const link = screen.getByRole("link", { name: "Source 2: Federal Statistics" });
    expect(link).toHaveAttribute("href", source.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a bare [n] without a source", () => {
    render(<Citation index={3} />);
    expect(screen.getByTestId("citation-bare")).toHaveTextContent("[3]");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("never links non-web URLs", () => {
    render(<Citation index={1} source={{ url: "javascript:alert(1)", title: "Bad" }} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("img", { name: "Source 1: Bad" })).toBeInTheDocument();
  });

  it("uses label overrides", () => {
    render(<Citation index={1} source={source} labels={{ source: (n, t) => `Quelle ${n}: ${t}` }} />);
    expect(screen.getByRole("link", { name: "Quelle 1: Federal Statistics" })).toBeInTheDocument();
  });
});

describe("SourceList", () => {
  it("lists numbered sources", () => {
    render(<SourceList sources={[source, { url: "https://example.com", title: "Example" }]} start={2} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Example/ })).toHaveAttribute("href", "https://example.com");
  });

  it("renders nothing when empty", () => {
    const { container } = render(<SourceList sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
