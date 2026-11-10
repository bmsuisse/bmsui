import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Calendar, type DateRange } from "../../../src/patterns/calendar/Calendar";

const day = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`) as HTMLButtonElement;

const Single = ({ initial = "", onChange = () => {}, ...props }: { initial?: string; onChange?: (v: string) => void; min?: string; max?: string }) => {
  const [v, setV] = useState(initial);
  return (
    <Calendar
      {...props}
      today="2026-11-10"
      value={v}
      onValueChange={(next) => {
        setV(next);
        onChange(next);
      }}
    />
  );
};

describe("Calendar", () => {
  it("shows the month of the value, Monday first in de-CH, with a today marker", () => {
    render(<Single initial="2026-11-18" />);
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers[0]).toBe("Mo");
    expect(day("2026-11-10")).toHaveAttribute("aria-current", "date");
    expect(day("2026-11-18")).toHaveAttribute("aria-pressed", "true");
    expect(day("2026-11-18")).toHaveAttribute("tabindex", "0");
  });

  it("selects a clicked day", () => {
    const onChange = vi.fn();
    render(<Single onChange={onChange} />);
    fireEvent.click(day("2026-11-20"));
    expect(onChange).toHaveBeenCalledWith("2026-11-20");
  });

  it("moves focus with arrows, PageUp/PageDown and Home/End", () => {
    render(<Single initial="2026-11-18" />);
    const grid = screen.getByRole("grid");
    day("2026-11-18").focus();
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(day("2026-11-19")).toHaveFocus();
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(day("2026-11-26")).toHaveFocus();
    fireEvent.keyDown(grid, { key: "Home" });
    expect(day("2026-11-23")).toHaveFocus();
    fireEvent.keyDown(grid, { key: "End" });
    expect(day("2026-11-29")).toHaveFocus();
    fireEvent.keyDown(grid, { key: "PageDown" });
    expect(screen.getByRole("grid", { name: "Dezember 2026" })).toBeInTheDocument();
    expect(day("2026-12-29")).toHaveFocus();
    fireEvent.keyDown(grid, { key: "PageUp", shiftKey: true });
    expect(day("2025-12-29")).toHaveFocus();
  });

  it("navigates months with the header buttons (labels translatable)", () => {
    render(<Calendar value="2026-11-10" onValueChange={() => {}} labels={{ nextMonth: "Nächster Monat" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Nächster Monat" }));
    expect(screen.getByRole("grid", { name: "Dezember 2026" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
  });

  it("blocks days outside min/max and isDateDisabled, and clamps keyboard focus", () => {
    const onChange = vi.fn();
    render(
      <Calendar
        value="2026-11-05"
        onValueChange={onChange}
        min="2026-11-03"
        max="2026-11-27"
        isDateDisabled={(iso) => iso === "2026-11-12"}
      />,
    );
    fireEvent.click(day("2026-11-02"));
    fireEvent.click(day("2026-11-12"));
    expect(onChange).not.toHaveBeenCalled();
    expect(day("2026-11-02")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    day("2026-11-05").focus();
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowUp" });
    expect(day("2026-11-03")).toHaveFocus();
  });

  it("uses Sunday first for en-US", () => {
    render(<Calendar locale="en-US" value="2026-11-10" onValueChange={() => {}} />);
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Sun");
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
  });

  it("picks a range in two clicks, ordering the ends", () => {
    const changes: DateRange[] = [];
    const Range = () => {
      const [v, setV] = useState<DateRange>({ from: "", to: "" });
      return (
        <Calendar
          mode="range"
          today="2026-11-10"
          value={v}
          onValueChange={(next) => {
            changes.push(next);
            setV(next);
          }}
        />
      );
    };
    render(<Range />);
    fireEvent.click(day("2026-11-20"));
    fireEvent.click(day("2026-11-12"));
    expect(changes).toEqual([
      { from: "2026-11-20", to: "" },
      { from: "2026-11-12", to: "2026-11-20" },
    ]);
    const cell = day("2026-11-15").closest("td") as HTMLElement;
    expect(cell).toHaveAttribute("aria-selected", "true");
    fireEvent.click(day("2026-11-25"));
    expect(changes.at(-1)).toEqual({ from: "2026-11-25", to: "" });
    expect(within(screen.getByRole("grid")).getAllByRole("gridcell")).toHaveLength(42);
  });
});
