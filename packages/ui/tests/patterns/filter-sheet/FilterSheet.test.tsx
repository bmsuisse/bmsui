import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterSheet, FilterSheetTrigger } from "../../../src";

describe("FilterSheet", () => {
  it("Apply fires onApply and closes", () => {
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={onOpenChange} onApply={onApply} onReset={() => {}} activeCount={2}>
        body
      </FilterSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByText("2 active")).toBeTruthy();
  });

  it("Reset doesn't close and is disabled without active filters", () => {
    const onReset = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <FilterSheet open onOpenChange={onOpenChange} onReset={onReset} activeCount={0}>
        body
      </FilterSheet>,
    );
    expect((screen.getByRole("button", { name: "Reset" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(
      <FilterSheet open onOpenChange={onOpenChange} onReset={onReset} activeCount={1}>
        body
      </FilterSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("has no Apply in live mode and honours labels", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} onReset={() => {}} labels={{ title: "Filter" }}>
        body
      </FilterSheet>,
    );
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(screen.getByText("Filter")).toBeTruthy();
  });
});

describe("FilterSheetTrigger", () => {
  it("shows the count only above zero", () => {
    const { rerender } = render(<FilterSheetTrigger activeCount={0} />);
    expect(screen.getByRole("button").textContent).toBe("Filters");
    rerender(<FilterSheetTrigger activeCount={3} />);
    expect(screen.getByRole("button", { name: "Filters, 3 active" }).textContent).toBe("Filters3");
  });
});
