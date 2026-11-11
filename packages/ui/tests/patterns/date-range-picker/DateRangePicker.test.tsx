import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DateRange } from "../../../src/patterns/calendar/Calendar";
import { DateRangePicker } from "../../../src/patterns/date-range-picker/DateRangePicker";

const day = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`) as HTMLButtonElement;

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

describe("DateRangePicker focus after a pick", () => {
  it("returns focus to the from field after a range pick", async () => {
    const Picker = () => {
      const [v, setV] = useState<DateRange>({ from: "", to: "" });
      return <DateRangePicker value={v} onValueChange={setV} today="2026-11-10" />;
    };
    render(<Picker />);
    fireEvent.click(screen.getByRole("button", { name: "Choose dates" }));
    await screen.findByRole("grid");
    fireEvent.click(day("2026-11-12"));
    fireEvent.click(day("2026-11-14"));
    await waitFor(() => expect(screen.getByLabelText("From")).toHaveFocus());
  });

describe("DateRangePicker review fixes", () => {
  it("fields reject blocked typed days", () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value={{ from: "", to: "" }}
        onValueChange={onChange}
        isDateDisabled={(iso) => iso === "2026-11-14"}
      />,
    );
    const from = screen.getByLabelText("From");
    fireEvent.change(from, { target: { value: "14.11.2026" } });
    fireEvent.blur(from);
    expect(onChange).not.toHaveBeenCalled();
    expect(from).toHaveAttribute("aria-invalid", "true");
  });
});

  it("shows one error message for either field and reports it", () => {
    const onInvalidChange = vi.fn();
    render(<DateRangePicker value={{ from: "", to: "" }} onValueChange={() => {}} onInvalidChange={onInvalidChange} min="2026-01-01" />);
    const to = screen.getByLabelText("To");
    fireEvent.change(to, { target: { value: "1.1.2025" } });
    fireEvent.blur(to);
    expect(screen.getByRole("alert")).toHaveTextContent("Date is out of range");
    expect(onInvalidChange).toHaveBeenLastCalledWith(true, "range");
    expect(to).toHaveAttribute("aria-describedby", screen.getByRole("alert").id);
    fireEvent.change(to, { target: { value: "2.1.2026" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onInvalidChange).toHaveBeenLastCalledWith(false, undefined);
  });

  it("read-only: calendar button disabled, calendar can't open, fields read-only", () => {
    render(<DateRangePicker value={{ from: "2026-11-10", to: "2026-11-12" }} onValueChange={() => {}} readOnly />);
    expect(screen.getByRole("button", { name: "Choose dates" })).toBeDisabled();
    expect(screen.getByLabelText("From")).toHaveAttribute("readonly");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("native=always: two browser date inputs, ordered range, no calendar button", () => {
    const changes: DateRange[] = [];
    render(
      <DateRangePicker
        value={{ from: "2026-11-10", to: "2026-11-12" }}
        onValueChange={(r) => changes.push(r)}
        native="always"
        min="2026-11-01"
        max="2026-11-30"
      />,
    );
    const from = screen.getByLabelText("From");
    const to = screen.getByLabelText("To");
    expect(from).toHaveAttribute("type", "date");
    expect(to).toHaveAttribute("max", "2026-11-30");
    expect(screen.queryByRole("button", { name: "Choose dates" })).not.toBeInTheDocument();
    fireEvent.change(from, { target: { value: "2026-11-20" } }); // after `to`: swapped
    expect(changes.at(-1)).toEqual({ from: "2026-11-12", to: "2026-11-20" });
    fireEvent.change(to, { target: { value: "2026-12-05" } }); // out of range: rejected with message
    expect(changes).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Date is out of range");
  });

  it("auto: touch devices get the browser's date inputs", () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q === "(pointer: coarse)",
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      render(<DateRangePicker value={{ from: "", to: "" }} onValueChange={() => {}} />);
      expect(screen.getByLabelText("From")).toHaveAttribute("type", "date");
    } finally {
      window.matchMedia = original;
    }
  });
});
