import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calendarModule } from "../../../src/patterns/calendar/CalendarLoader";
import { DateInput } from "../../../src/patterns/date-input/DateInput";

describe("calendar chunk load failure", () => {
  const original = calendarModule.load;
  afterEach(() => {
    calendarModule.load = original;
  });

  it("shows an inline error with Retry instead of crashing; hovering the button doesn't reject unhandled", async () => {
    // Offline, or a deploy replaced the chunk.
    const load = vi.fn(() => Promise.reject(new Error("Failed to fetch dynamically imported module"))) as unknown as typeof original;
    calendarModule.load = load;
    render(<DateInput aria-label="d" value="2026-11-10" onValueChange={() => {}} picker="calendar" native="never" />);
    const button = screen.getByRole("button", { name: "Choose date" });
    fireEvent.pointerEnter(button); // preload: the rejection is swallowed
    fireEvent.click(button);
    expect(await screen.findByText("Calendar could not be loaded")).toBeInTheDocument();
    expect(screen.getByLabelText("d")).toHaveValue("10.11.2026"); // the field itself still works

    // Retry loads again; once the chunk is reachable the calendar shows.
    calendarModule.load = original;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("grid")).toBeInTheDocument();
  });
});
