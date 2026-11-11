import { InboxIcon } from "@heroicons/react/24/outline";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, FilteredEmptyState } from "../../../src/patterns/empty-state/EmptyState";

describe("EmptyState", () => {
  it("renders title, description, icon and action", () => {
    const { container } = render(
      <EmptyState icon={InboxIcon} title="No tasks" description="You're all caught up." action={<button>New task</button>} />,
    );
    expect(screen.getByText("No tasks")).toBeInTheDocument();
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New task" })).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders text only without icon/description/action", () => {
    const { container } = render(<EmptyState title="Nothing" />);
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("fill grows in a flex parent; passes through className and attributes", () => {
    render(<EmptyState title="x" fill className="custom" data-foo="bar" />);
    const el = screen.getByTestId("empty-state");
    expect(el).toHaveClass("flex-1", "custom");
    expect(el).toHaveAttribute("data-foo", "bar");
  });
});

describe("FilteredEmptyState", () => {
  it("shows default labels and resets", () => {
    const onReset = vi.fn();
    render(<FilteredEmptyState onReset={onReset} />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("accepts translated labels", () => {
    render(<FilteredEmptyState onReset={() => {}} labels={{ title: "Keine Treffer", reset: "Filter zurücksetzen" }} />);
    expect(screen.getByText("Keine Treffer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter zurücksetzen" })).toBeInTheDocument();
  });

  it("derives the reset button test id from data-testid", () => {
    render(<FilteredEmptyState onReset={() => {}} data-testid="sites-empty" />);
    expect(screen.getByTestId("sites-empty")).toBeInTheDocument();
    expect(screen.getByTestId("sites-empty-reset")).toHaveTextContent("Reset filters");
  });
});
