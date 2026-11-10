import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  TablePage,
  TableResultCount,
  TableSearch,
  TableShell,
  TableToolbar,
} from "../../../src/patterns/table-shell/TableShell";

describe("TableShell", () => {
  it("renders toolbar, meta, body and footer bands", () => {
    render(
      <TableShell toolbar={<span>tb</span>} meta={<span>meta</span>} footer={<span>foot</span>}>
        <table />
      </TableShell>,
    );
    const shell = screen.getByTestId("table-shell");
    expect(shell).toHaveAttribute("data-table-shell");
    for (const slot of ["toolbar", "meta", "body", "footer"]) {
      expect(shell.querySelector(`[data-slot=table-shell-${slot}]`)).not.toBeNull();
    }
  });

  it("fill makes the shell and body flex; flush drops the border; testId still works", () => {
    render(
      <TableShell fill flush testId="legacy">
        x
      </TableShell>,
    );
    const shell = screen.getByTestId("legacy");
    expect(shell).toHaveClass("flex-1");
    expect(shell).not.toHaveClass("border");
    expect(shell.querySelector("[data-slot=table-shell-body]")).toHaveClass("flex-1");
  });
});

describe("TableToolbar / TableSearch", () => {
  it("lays out title, search, filters and actions", () => {
    const onChange = vi.fn();
    render(
      <TableToolbar
        title="Offers"
        search={<TableSearch value="" onChange={onChange} aria-label="Search" />}
        filters={<button>Status</button>}
        actions={<button>New</button>}
      />,
    );
    expect(screen.getByText("Offers")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("abc");
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
  });
});

describe("TableResultCount", () => {
  it("formats total, filtered and has-more counts", () => {
    const { rerender } = render(<TableResultCount shown={1234} />);
    expect(screen.getByTestId("table-result-count")).toHaveTextContent("1,234 results");
    rerender(<TableResultCount shown={12} total={48} />);
    expect(screen.getByTestId("table-result-count")).toHaveTextContent("12 of 48");
    rerender(<TableResultCount shown={48} hasMore />);
    expect(screen.getByTestId("table-result-count")).toHaveTextContent("48+ loaded");
    rerender(<TableResultCount shown={5} labels={{ total: (n) => `${n} Treffer` }} />);
    expect(screen.getByTestId("table-result-count")).toHaveTextContent("5 Treffer");
  });
});

describe("TablePage", () => {
  it("puts a PageHeader above a filling TableShell", () => {
    render(
      <TablePage title="Offers" actions={<button>New</button>} toolbar={<span>tb</span>} footer={<span>pager</span>}>
        <div>grid</div>
      </TablePage>,
    );
    expect(screen.getByRole("heading", { name: "Offers" })).toBeInTheDocument();
    expect(screen.getByTestId("table-page")).toHaveClass("h-full");
    expect(screen.getByTestId("table-shell")).toHaveClass("flex-1");
    expect(screen.getByText("grid")).toBeInTheDocument();
  });

  it("header replaces the built-in PageHeader", () => {
    render(
      <TablePage header={<div>custom header</div>}>
        <div />
      </TablePage>,
    );
    expect(screen.getByText("custom header")).toBeInTheDocument();
    expect(screen.queryByTestId("page-header")).toBeNull();
  });
});
