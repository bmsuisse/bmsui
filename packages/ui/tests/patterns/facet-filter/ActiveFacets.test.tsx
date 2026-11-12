import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActiveFacets, type FacetDefinition } from "../../../src";

const facets: FacetDefinition[] = [
  { key: "supplier", label: "Supplier", options: [{ value: "acme", label: "Acme AG" }, { value: "bolt", label: "Bolt GmbH" }] },
  { key: "own", label: "Own brand", type: "boolean", options: [{ value: "true" }] },
];

describe("ActiveFacets", () => {
  it("renders nothing without a selection", () => {
    const { container } = render(<ActiveFacets facets={facets} value={{}} onValueChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows a chip per selected value, boolean facets under their label", () => {
    render(<ActiveFacets facets={facets} value={{ supplier: ["acme", "bolt"], own: ["true"] }} onValueChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Remove Acme AG" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Bolt GmbH" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Own brand" })).toBeTruthy();
  });

  it("describes range and date facets in one chip", () => {
    const more: FacetDefinition[] = [
      { key: "price", label: "Price", type: "range", range: { min: 0, max: 200, unit: "CHF" } },
      { key: "created", label: "Created", type: "dateRange" },
    ];
    render(<ActiveFacets facets={more} value={{ price: ["20..80"], created: ["2026-01-01.."] }} onValueChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Remove Price: 20 – 80 CHF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Created: ≥ 2026-01-01" })).toBeTruthy();
  });

  it("removes one value and drops an emptied key", () => {
    const onValueChange = vi.fn();
    render(<ActiveFacets facets={facets} value={{ supplier: ["acme", "bolt"], own: ["true"] }} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Acme AG" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ supplier: ["bolt"], own: ["true"] });
    fireEvent.click(screen.getByRole("button", { name: "Remove Own brand" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ supplier: ["acme", "bolt"] });
  });

  it("clears everything and honours labels", () => {
    const onValueChange = vi.fn();
    render(
      <ActiveFacets
        facets={facets}
        value={{ supplier: ["acme"] }}
        onValueChange={onValueChange}
        labels={{ clearAll: "Alle löschen", remove: (l) => `${l} entfernen` }}
      />,
    );
    expect(screen.getByRole("button", { name: "Acme AG entfernen" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Alle löschen" }));
    expect(onValueChange).toHaveBeenCalledWith({});
  });
});
