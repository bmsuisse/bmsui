import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type Facet, FacetFilter, countActiveFilters } from "../../../src";

const supplier: Facet = {
  key: "supplier",
  label: "Supplier",
  options: Array.from({ length: 10 }, (_, i) => ({ value: `s${i}`, label: `Supplier ${i}`, count: i * 1000 })),
};
const ownBrand: Facet = { key: "own", label: "Own brand", type: "boolean", options: [{ value: "true", count: 4 }] };

describe("FacetFilter", () => {
  it("adds and removes a value, dropping the empty key", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<FacetFilter facets={[supplier]} value={{}} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Supplier 1\b/ }));
    expect(onValueChange).toHaveBeenLastCalledWith({ supplier: ["s1"] });
    rerender(<FacetFilter facets={[supplier]} value={{ supplier: ["s1"] }} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Supplier 1\b/ }));
    expect(onValueChange).toHaveBeenLastCalledWith({});
  });

  it("collapses long lists and expands with aria-expanded", () => {
    render(<FacetFilter facets={[supplier]} value={{}} onValueChange={() => {}} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(8);
    const more = screen.getByRole("button", { name: "Show 2 more" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(more);
    expect(screen.getAllByRole("checkbox")).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Show less" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps a selected option visible while collapsed", () => {
    render(<FacetFilter facets={[supplier]} value={{ supplier: ["s9"] }} onValueChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: /Supplier 9/ })).toBeTruthy();
  });

  it("renders boolean facets as a switch", () => {
    const onValueChange = vi.fn();
    render(<FacetFilter facets={[ownBrand]} value={{}} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onValueChange).toHaveBeenCalledWith({ own: ["true"] });
  });

  it("hides empty facets unless hideEmpty is false", () => {
    const empty: Facet = { key: "e", label: "Empty", options: [] };
    const { rerender } = render(<FacetFilter facets={[empty]} value={{}} onValueChange={() => {}} />);
    expect(screen.queryByText("Empty")).toBeNull();
    rerender(<FacetFilter facets={[empty]} value={{}} onValueChange={() => {}} hideEmpty={false} />);
    expect(screen.getByText("Empty")).toBeTruthy();
  });

  it("resets everything", () => {
    const onValueChange = vi.fn();
    render(<FacetFilter facets={[supplier]} value={{ supplier: ["s1"] }} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(onValueChange).toHaveBeenCalledWith({});
  });

  it("formats counts, announces them and accepts label overrides", () => {
    render(
      <FacetFilter
        facets={[supplier]}
        value={{}}
        onValueChange={() => {}}
        formatCount={(n) => `#${n}`}
        labels={{ showMore: (n) => `Mehr (${n})` }}
      />,
    );
    expect(screen.getByText("#1000")).toBeTruthy();
    expect(screen.getByText("1000 results")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mehr (2)" })).toBeTruthy();
  });

  it("labels each group", () => {
    render(<FacetFilter facets={[supplier]} value={{}} onValueChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Supplier" })).toBeTruthy();
  });
});

describe("countActiveFilters", () => {
  it("sums selections", () => {
    expect(countActiveFilters({ a: ["1", "2"], b: ["3"] })).toBe(3);
  });
});
