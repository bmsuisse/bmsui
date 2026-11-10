import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DateRange } from "../../../src/patterns/calendar/Calendar";
import { DatePicker, DateRangePicker } from "../../../src/patterns/date-picker/DatePicker";

const day = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`) as HTMLButtonElement;

describe("DatePicker", () => {
  it("types like DateInput and picks from the calendar popover", async () => {
    const onChange = vi.fn();
    const Picker = () => {
      const [v, setV] = useState("2026-11-10");
      return (
        <DatePicker
          aria-label="Due"
          value={v}
          onValueChange={(next) => {
            setV(next);
            onChange(next);
          }}
        />
      );
    };
    render(<Picker />);
    const input = screen.getByLabelText("Due");
    expect(input).toHaveValue("10.11.2026");
    fireEvent.change(input, { target: { value: "1.12.26" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith("2026-12-01");

    fireEvent.click(screen.getByRole("button", { name: "Choose date" }));
    expect(await screen.findByRole("grid", { name: "Dezember 2026" })).toBeInTheDocument();
    expect(day("2026-12-01")).toHaveFocus();
    fireEvent.click(day("2026-12-24"));
    expect(onChange).toHaveBeenLastCalledWith("2026-12-24");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(input).toHaveValue("24.12.2026");
  });

  it("rejects typed days outside min/max", () => {
    const onChange = vi.fn();
    render(<DatePicker aria-label="Due" value="" onValueChange={onChange} min="2026-01-01" max="2026-12-31" />);
    const input = screen.getByLabelText("Due");
    fireEvent.change(input, { target: { value: "1.1.2027" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("disables the calendar button with the field", () => {
    render(<DatePicker aria-label="Due" value="" onValueChange={() => {}} disabled labels={{ openCalendar: "Kalender" }} />);
    expect(screen.getByRole("button", { name: "Kalender" })).toBeDisabled();
  });
});

describe("DateRangePicker", () => {
  it("edits each end by typing (swapping a reversed range) and picks a range in the popover", async () => {
    const changes: DateRange[] = [];
    const Picker = () => {
      const [v, setV] = useState<DateRange>({ from: "2026-11-02", to: "2026-11-27" });
      return (
        <DateRangePicker
          value={v}
          onValueChange={(next) => {
            changes.push(next);
            setV(next);
          }}
        />
      );
    };
    render(<Picker />);
    const from = screen.getByLabelText("From");
    fireEvent.change(from, { target: { value: "30.11.2026" } });
    fireEvent.blur(from);
    expect(changes.at(-1)).toEqual({ from: "2026-11-27", to: "2026-11-30" });

    fireEvent.click(screen.getByRole("button", { name: "Choose dates" }));
    await screen.findByRole("grid");
    fireEvent.click(day("2026-11-05"));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(day("2026-11-09"));
    });
    expect(changes.at(-1)).toEqual({ from: "2026-11-05", to: "2026-11-09" });
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.getByLabelText("To")).toHaveValue("09.11.2026");
  });
});
