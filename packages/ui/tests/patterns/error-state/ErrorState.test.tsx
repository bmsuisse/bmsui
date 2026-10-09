import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toErrorInfo } from "../../../src/lib/errorState";
import { ErrorState, InlineError } from "../../../src/patterns/error-state/ErrorState";
import { Combobox } from "../../../src/patterns/combobox/Combobox";
import { KpiCard } from "../../../src/patterns/kpi-card/KpiCard";
import { SearchBar } from "../../../src/patterns/search-bar/SearchBar";

describe("toErrorInfo", () => {
  it("normalizes strings, Errors and objects, and returns undefined for empty", () => {
    expect(toErrorInfo("boom")).toEqual({ message: "boom" });
    expect(toErrorInfo(new Error("bad"))?.message).toBe("bad");
    expect(toErrorInfo({ title: "T" })).toEqual({ title: "T", message: undefined, details: undefined });
    expect(toErrorInfo(null)).toBeUndefined();
    expect(toErrorInfo("")).toBeUndefined();
    expect(toErrorInfo(false)).toBeUndefined();
  });
});

describe("ErrorState", () => {
  it("renders nothing without an error", () => {
    const { container } = render(<ErrorState error={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows default title, message, details and a working Retry", () => {
    const onRetry = vi.fn();
    render(<ErrorState error={{ message: "Server said no", details: "HTTP 500" }} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Couldn't load data")).toBeInTheDocument();
    expect(screen.getByText("Server said no")).toBeInTheDocument();
    expect(screen.getByText("Show details")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("omits Retry without onRetry", () => {
    render(<ErrorState error="x" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("InlineError", () => {
  it("shows the message and retries", () => {
    const onRetry = vi.fn();
    render(<InlineError error={new Error("nope")} onRetry={onRetry} />);
    expect(screen.getByText("nope")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("error integration", () => {
  it("SearchBar shows an inline error and marks the input invalid", () => {
    render(<SearchBar value="a" onChange={() => {}} error="Search failed" />);
    expect(screen.getByText("Search failed")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("SearchBar accepts the new `loading` prop", () => {
    const { container } = render(<SearchBar value="" onChange={() => {}} loading />);
    expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("Combobox shows the error with Retry instead of options when opened", () => {
    const onRetry = vi.fn();
    render(
      <Combobox options={[{ value: "a", label: "A" }]} value={null} onChange={() => {}} error="Fetch failed" onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByText("Fetch failed")).toBeInTheDocument();
    expect(screen.queryByText("A")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("KpiCard replaces the value with a warning and Retry", () => {
    const onRetry = vi.fn();
    render(<KpiCard label="Revenue" value={5} error="down" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
