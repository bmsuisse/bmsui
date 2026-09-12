import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "../../../src/patterns/empty-state/EmptyState";

describe("EmptyState", () => {
  it("renders title and description in a status region", () => {
    render(<EmptyState title="No tasks yet" description="Tasks you create appear here." />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("data-variant", "empty");
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByText("Tasks you create appear here.")).toBeInTheDocument();
  });

  it("uses role=alert for the error variant", () => {
    render(<EmptyState variant="error" title="Could not load customers" />);
    expect(screen.getByRole("alert")).toHaveAttribute("data-variant", "error");
  });

  it("renders primary and secondary actions and fires them", () => {
    const onAction = vi.fn();
    const onSecondary = vi.fn();
    render(
      <EmptyState
        variant="no-results"
        title="No matches"
        action={{ label: "Clear search", onClick: onAction }}
        secondaryAction={{ label: "Reset filters", onClick: onSecondary }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("renders a custom icon and children", () => {
    const Icon = ({ className }: { className?: string }) => <svg data-testid="custom-icon" className={className} />;
    render(
      <EmptyState title="Empty" icon={Icon} testId="empty">
        Hint text
      </EmptyState>,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(screen.getByText("Hint text")).toBeInTheDocument();
    expect(screen.getByTestId("empty")).toBeInTheDocument();
  });

  it("applies the compact size and fill layout classes", () => {
    render(<EmptyState title="Nothing" size="sm" fill testId="es" />);
    const el = screen.getByTestId("es");
    expect(el).toHaveClass("flex-1");
    expect(el).toHaveClass("py-5");
  });
});
