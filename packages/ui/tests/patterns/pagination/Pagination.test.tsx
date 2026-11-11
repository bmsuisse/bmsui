import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPageRange, Pagination } from "../../../src/patterns/pagination/Pagination";

describe("getPageRange", () => {
  it("shows all pages when they fit", () => {
    expect(getPageRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("puts ellipses on the far side(s) with a constant slot count", () => {
    expect(getPageRange(1, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
    expect(getPageRange(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
    expect(getPageRange(10, 10)).toEqual([1, "ellipsis", 6, 7, 8, 9, 10]);
    expect(getPageRange(7, 20, 2)).toEqual([1, "ellipsis", 5, 6, 7, 8, 9, "ellipsis", 20]);
  });

  it("handles 0 pages and clamps out-of-range pages", () => {
    expect(getPageRange(1, 0)).toEqual([]);
    expect(getPageRange(99, 10)).toEqual(getPageRange(10, 10));
  });
});

describe("Pagination", () => {
  it("renders the range text and marks the current page", () => {
    render(<Pagination page={3} onPageChange={() => {}} totalItems={312} pageSize={25} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByTestId("pagination-range")).toHaveTextContent("51–75 of 312");
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Page 13" })).toBeInTheDocument();
    expect(screen.getByTestId("pagination-compact")).toHaveTextContent("3 / 13");
  });

  it("navigates with prev/next/page buttons and disables at the edges", () => {
    const onPageChange = vi.fn();
    const { rerender } = render(<Pagination page={1} onPageChange={onPageChange} pageCount={4} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Page 4" }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    onPageChange.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Page 1" }));
    expect(onPageChange).not.toHaveBeenCalled();
    rerender(<Pagination page={4} onPageChange={onPageChange} pageCount={4} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("clamps the last page's range and handles empty results", () => {
    const { rerender } = render(<Pagination page={13} onPageChange={() => {}} totalItems={312} pageSize={25} />);
    expect(screen.getByTestId("pagination-range")).toHaveTextContent("301–312 of 312");
    rerender(<Pagination page={1} onPageChange={() => {}} totalItems={0} pageSize={25} />);
    expect(screen.getByTestId("pagination-range")).toHaveTextContent("No results");
  });

  it("compact hides page numbers; labels translate", () => {
    render(
      <Pagination
        page={2}
        onPageChange={() => {}}
        pageCount={9}
        compact
        labels={{ next: "Weiter", previous: "Zurück", compact: (p, n) => `${p} von ${n}` }}
      />,
    );
    expect(screen.getByRole("button", { name: "Weiter" })).toBeInTheDocument();
    expect(screen.getByTestId("pagination-compact")).toHaveTextContent("2 von 9");
    expect(screen.getByRole("navigation").querySelector("ul")).toHaveClass("hidden");
  });

  it("renders the page-size select when options and handler are given", () => {
    render(
      <Pagination
        page={1}
        onPageChange={() => {}}
        totalItems={100}
        pageSize={25}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={() => {}}
      />,
    );
    expect(screen.getByTestId("pagination-page-size")).toHaveTextContent("25");
  });
});

describe("Pagination locale", () => {
  it("defaults to de-CH number formatting", () => {
    render(<Pagination page={1} onPageChange={() => {}} totalItems={12345} pageSize={25} />);
    expect(screen.getByTestId("pagination-range")).toHaveTextContent(`1–25 of ${new Intl.NumberFormat("de-CH").format(12345)}`);
    expect(new Intl.NumberFormat("de-CH").format(12345)).not.toBe("12,345");
  });
});
