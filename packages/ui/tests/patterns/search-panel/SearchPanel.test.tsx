import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchPanel } from "../../../src/patterns/search-panel/SearchPanel";
import { SearchTrigger } from "../../../src/patterns/search-panel/SearchTrigger";

describe("SearchPanel", () => {
  it("calls onChange as the user types", () => {
    const onChange = vi.fn();
    render(<SearchPanel value="" onChange={onChange} placeholder="Search…" />);
    fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "acme" } });
    expect(onChange).toHaveBeenCalledWith("acme");
  });

  it("shows a spinner instead of the search icon while loading", () => {
    const { container, rerender } = render(<SearchPanel value="" onChange={vi.fn()} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    rerender(<SearchPanel value="" onChange={vi.fn()} isLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders the shortcut hint only when given one", () => {
    const { rerender } = render(<SearchPanel value="" onChange={vi.fn()} />);
    expect(screen.queryByText("⌘K")).not.toBeInTheDocument();
    rerender(<SearchPanel value="" onChange={vi.fn()} shortcutHint="⌘K" />);
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("renders mode pills and calls onModeChange when one is clicked", () => {
    const onModeChange = vi.fn();
    render(
      <SearchPanel
        value=""
        onChange={vi.fn()}
        modes={[
          { key: "search", label: "Search" },
          { key: "ask", label: "Ask AI" },
        ]}
        activeMode="search"
        onModeChange={onModeChange}
      />,
    );
    fireEvent.click(screen.getByText("Ask AI"));
    expect(onModeChange).toHaveBeenCalledWith("ask");
  });

  it("squares the bottom corners when expanded", () => {
    const { container, rerender } = render(<SearchPanel value="" onChange={vi.fn()} />);
    expect(container.firstChild).toHaveClass("rounded-2xl");
    rerender(<SearchPanel value="" onChange={vi.fn()} expanded />);
    expect(container.firstChild).toHaveClass("rounded-t-2xl");
  });
});

describe("SearchPanel clear button and appearance", () => {
  it("shows a clear button once there is a value and clears via onChange('')", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchPanel value="" onChange={onChange} />);
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    rerender(<SearchPanel value="acme" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("drops the card chrome with appearance=flush", () => {
    const { container } = render(<SearchPanel value="" onChange={vi.fn()} appearance="flush" />);
    expect(container.firstChild).not.toHaveClass("rounded-2xl");
    expect(container.firstChild).not.toHaveClass("border");
    expect(container.firstChild).toHaveAttribute("role", "search");
  });
});

describe("SearchTrigger", () => {
  it("renders the field variant with placeholder text and a shortcut hint", () => {
    render(<SearchTrigger variant="field" placeholder="Customers, places…" shortcutHint="⌘K" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Search" })).toHaveTextContent("Customers, places…");
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("renders an accessible icon button and forwards onClick", () => {
    const onClick = vi.fn();
    render(<SearchTrigger onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("accepts a custom label", () => {
    render(<SearchTrigger label="Open global search" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Open global search" })).toBeInTheDocument();
  });
});
