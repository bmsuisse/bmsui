import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchOverlay } from "../../../src/patterns/search-panel/SearchOverlay";

describe("SearchOverlay", () => {
  it("renders nothing while closed and the input plus children once open", () => {
    const { rerender } = render(
      <SearchOverlay open={false} onOpenChange={vi.fn()} value="" onChange={vi.fn()} placeholder="Search…">
        <p>results</p>
      </SearchOverlay>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(
      <SearchOverlay open onOpenChange={vi.fn()} value="" onChange={vi.fn()} placeholder="Search…">
        <p>results</p>
      </SearchOverlay>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
    expect(screen.getByText("results")).toBeInTheDocument();
  });

  it("shows a back button on the phone layout (matchMedia defaults to no match in tests)", () => {
    const onOpenChange = vi.fn();
    render(<SearchOverlay open onOpenChange={onOpenChange} value="" onChange={vi.fn()} closeLabel="Back" />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clears a non-empty query on Escape instead of closing, then closes on the next Escape", () => {
    const onOpenChange = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchOverlay open onOpenChange={onOpenChange} value="acme" onChange={onChange} placeholder="Search…" />,
    );
    fireEvent.keyDown(screen.getByPlaceholderText("Search…"), { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith("");
    expect(onOpenChange).not.toHaveBeenCalled();

    rerender(<SearchOverlay open onOpenChange={onOpenChange} value="" onChange={onChange} placeholder="Search…" />);
    fireEvent.keyDown(screen.getByPlaceholderText("Search…"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("forwards mode pills and a footer", () => {
    const onModeChange = vi.fn();
    render(
      <SearchOverlay
        open
        onOpenChange={vi.fn()}
        value=""
        onChange={vi.fn()}
        modes={[
          { key: "search", label: "Search" },
          { key: "ask", label: "Ask AI" },
        ]}
        activeMode="search"
        onModeChange={onModeChange}
        footer={<span>hints</span>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));
    expect(onModeChange).toHaveBeenCalledWith("ask");
    expect(screen.getByText("hints")).toBeInTheDocument();
  });
});
