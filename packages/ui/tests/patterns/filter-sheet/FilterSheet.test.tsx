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

describe("FilterSheet result count", () => {
  it("shows the count on the primary button, which applies and closes", () => {
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={onOpenChange} onApply={onApply} resultCount={128}>
        body
      </FilterSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show 128 results" }));
    expect(onApply).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("offers the count button in live mode too, and singularises", () => {
    const onOpenChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={onOpenChange} resultCount={1}>
        body
      </FilterSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show 1 result" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("FilterSheet footer", () => {
  it("renders no footer without handlers", () => {
    render(
      <FilterSheet open onOpenChange={() => {}}>
        body
      </FilterSheet>,
    );
    expect(document.querySelector("[data-slot=dialog-footer], [data-slot=sheet-footer]")).toBeNull();
  });
});

describe("FilterSheetTrigger", () => {
  it("shows the count only above zero", () => {
    const { rerender } = render(<FilterSheetTrigger activeCount={0} />);
    expect(screen.getByRole("button").textContent).toBe("Filters");
    rerender(<FilterSheetTrigger activeCount={3} />);
    expect(screen.getByRole("button", { name: /Filters/ }).textContent).toBe("Filters33 active");
  });
});
