import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type FacetDefinition, FacetFilter, FacetFilterSkeleton, countActiveFacets } from "../../../src";

const supplier: FacetDefinition = {
  key: "supplier",
  label: "Supplier",
  options: Array.from({ length: 12 }, (_, i) => ({ value: `s${i}`, label: `Supplier ${i}`, count: i * 1000 })),
};
const ownBrand: FacetDefinition = { key: "own", label: "Own brand", type: "boolean", options: [{ value: "true", count: 4 }] };

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
    const more = screen.getByRole("button", { name: "Show 4 more" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(more);
    expect(screen.getAllByRole("checkbox")).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Show less" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps a selected option visible while collapsed", () => {
    render(<FacetFilter facets={[supplier]} value={{ supplier: ["s11"] }} onValueChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: /Supplier 11/ })).toBeTruthy();
  });

  it("renders boolean facets as a switch", () => {
    const onValueChange = vi.fn();
    render(<FacetFilter facets={[ownBrand]} value={{}} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onValueChange).toHaveBeenCalledWith({ own: ["true"] });
  });

  it("switches a boolean facet off", () => {
    const onValueChange = vi.fn();
    render(<FacetFilter facets={[ownBrand]} value={{ own: ["true"] }} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onValueChange).toHaveBeenCalledWith({});
  });

  it("hides empty facets unless hideEmpty is false", () => {
    const empty: FacetDefinition = { key: "e", label: "Empty", options: [] };
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
    expect(screen.getByText("#1000 results")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mehr (4)" })).toBeTruthy();
  });

  it("lists a selected value that's gone from the options so it can be unticked", () => {
    const onValueChange = vi.fn();
    render(<FacetFilter facets={[supplier]} value={{ supplier: ["gone"] }} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "gone" }));
    expect(onValueChange).toHaveBeenCalledWith({});
  });

  it("doesn't collapse when only one or two options would hide", () => {
    const few = { ...supplier, options: supplier.options.slice(0, 10) };
    render(<FacetFilter facets={[few]} value={{}} onValueChange={() => {}} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(10);
    expect(screen.queryByRole("button", { name: /Show/ })).toBeNull();
  });

  it("filters a searchable facet's options by text", () => {
    const searchable = { ...supplier, searchable: true };
    render(<FacetFilter facets={[searchable]} value={{}} onValueChange={() => {}} />);
    const box = screen.getByRole("searchbox", { name: "Search supplier" });
    fireEvent.change(box, { target: { value: "supplier 11" } });
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Show/ })).toBeNull();
    fireEvent.change(box, { target: { value: "zzz" } });
    expect(screen.getByText("No matches")).toBeTruthy();
  });

  it("clears a single facet from its heading", () => {
    const onValueChange = vi.fn();
    render(
      <FacetFilter facets={[supplier, ownBrand]} value={{ supplier: ["s1", "s2"], own: ["true"] }} onValueChange={onValueChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear supplier" }));
    expect(onValueChange).toHaveBeenCalledWith({ own: ["true"] });
  });

  it("folds a collapsible facet and shows its selection count", () => {
    render(<FacetFilter facets={[supplier]} collapsible value={{ supplier: ["s1", "s2"] }} onValueChange={() => {}} />);
    const heading = screen.getByRole("button", { name: /Supplier/ });
    expect(heading.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(heading);
    expect(heading.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByText("2 selected")).toBeTruthy();
  });

  it("starts folded with defaultCollapsed unless something is selected", () => {
    const folded = { ...supplier, collapsible: true, defaultCollapsed: true };
    const { rerender, unmount } = render(<FacetFilter facets={[folded]} value={{}} onValueChange={() => {}} />);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    unmount();
    render(<FacetFilter facets={[folded]} value={{ supplier: ["s1"] }} onValueChange={() => {}} />);
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
    void rerender;
  });

  it("renders a single facet as radios that replace the selection", () => {
    const onValueChange = vi.fn();
    const sort: FacetDefinition = {
      key: "sort",
      label: "Sort",
      type: "single",
      options: [{ value: "rel", label: "Relevance" }, { value: "new", label: "Newest" }],
    };
    render(<FacetFilter facets={[sort]} value={{ sort: ["rel"] }} onValueChange={onValueChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    fireEvent.click(screen.getByRole("radio", { name: /Newest/ }));
    expect(onValueChange).toHaveBeenCalledWith({ sort: ["new"] });
  });

  it("renders a custom facet body", () => {
    const custom = { key: "price", label: "Price", options: [], render: () => <div>my range</div> };
    render(<FacetFilter facets={[custom]} value={{}} onValueChange={() => {}} hideEmpty={false} />);
    expect(screen.getByText("my range")).toBeTruthy();
  });

  it("labels each group", () => {
    render(<FacetFilter facets={[supplier]} value={{}} onValueChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Supplier" })).toBeTruthy();
  });
});

describe("countActiveFacets", () => {
  it("sums selections", () => {
    expect(countActiveFacets({ a: ["1", "2"], b: ["3"] })).toBe(3);
  });
});

describe("FacetFilterSkeleton", () => {
  it("is hidden from assistive tech and sized by props", () => {
    const { container } = render(<FacetFilterSkeleton groups={2} rows={3} />);
    expect((container.firstChild as HTMLElement).getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("[class*='space-y-2.5']")).toHaveLength(2);
  });
});
