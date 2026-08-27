import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "../../../src/patterns/search-bar/SearchBar";

describe("SearchBar", () => {
  it("renders the current value and forwards changes", () => {
    const onChange = vi.fn();
    render(<SearchBar value="foo" onChange={onChange} placeholder="Search…" />);
    const input = screen.getByPlaceholderText("Search…");
    expect(input).toHaveValue("foo");
    fireEvent.change(input, { target: { value: "foobar" } });
    expect(onChange).toHaveBeenCalledWith("foobar");
  });

  it("shows no clear button when the value is empty", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("clears via onChange('') by default when the clear button is clicked", () => {
    const onChange = vi.fn();
    render(<SearchBar value="foo" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("calls a custom onClear instead of onChange when provided", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<SearchBar value="foo" onChange={onChange} onClear={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onClear).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("hides the clear button entirely when onClear is false, even with a value", () => {
    render(<SearchBar value="foo" onChange={() => {}} onClear={false} />);
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("respects a custom clearLabel", () => {
    render(<SearchBar value="foo" onChange={() => {}} clearLabel="Reset search" />);
    expect(screen.getByRole("button", { name: "Reset search" })).toBeInTheDocument();
  });

  it("shows a spinner instead of the search icon while isLoading", () => {
    const { container, rerender } = render(<SearchBar value="" onChange={() => {}} />);
    expect(container.querySelector('[role="status"]')).not.toBeInTheDocument();
    rerender(<SearchBar value="" onChange={() => {}} isLoading />);
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });
});
