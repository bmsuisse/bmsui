import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { toLocalIsoDateTime } from "../../../src/lib/dateField";
import { formatTime, parseTime, shiftTime, timePlaceholder, toTime } from "../../../src/lib/timeField";
import { DateTimeInput } from "../../../src/patterns/time-input/DateTimeInput";
import { TimeInput } from "../../../src/patterns/time-input/TimeInput";

describe("timeField", () => {
  it("parses the common spellings", () => {
    expect(parseTime("9")).toBe("09:00");
    expect(parseTime("930")).toBe("09:30");
    expect(parseTime("0930")).toBe("09:30");
    expect(parseTime("9:30")).toBe("09:30");
    expect(parseTime("09.30")).toBe("09:30");
    expect(parseTime("9,30")).toBe("09:30");
    expect(parseTime("9h30")).toBe("09:30");
    expect(parseTime("9:30:15")).toBe("09:30");
    expect(parseTime("9:30 pm")).toBe("21:30");
    expect(parseTime("12am")).toBe("00:00");
    expect(parseTime("12:15 PM")).toBe("12:15");
  });

  it("rejects non-times", () => {
    for (const bad of ["24:00", "9:60", "abc", "12345", "13pm", "0pm", "", "9:"]) expect(parseTime(bad)).toBeNull();
  });

  it("formats per locale and extracts the time from datetimes", () => {
    expect(formatTime("14:05", "de-CH")).toBe("14:05");
    expect(formatTime("14:05", "en-US")).toBe("2:05 PM");
    expect(formatTime("00:00", "en-US")).toBe("12:00 AM");
    expect(formatTime("junk", "de-CH")).toBe("");
    expect(timePlaceholder("de-CH")).toBe("hh:mm");
    expect(timePlaceholder("en-US")).toBe("hh:mm am");
    expect(toTime("2026-11-12T09:30")).toBe("09:30");
    expect(toTime("09:30:00")).toBe("09:30");
    expect(toTime("nope")).toBe("");
  });

  it("shifts inside the day and min/max", () => {
    expect(shiftTime("09:30", 15)).toBe("09:45");
    expect(shiftTime("23:55", 15)).toBe("23:59");
    expect(shiftTime("00:05", -15)).toBe("00:00");
    expect(shiftTime("10:00", 60, "08:00", "10:30")).toBe("10:30");
  });

  it("toLocalIsoDateTime uses local time, not UTC", () => {
    expect(toLocalIsoDateTime(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05T23:30");
    expect(toLocalIsoDateTime(new Date(2026, 0, 5, 0, 5))).toBe("2026-01-05T00:05");
  });
});

type TimeProps = Partial<React.ComponentProps<typeof TimeInput>>;

const Controlled = ({ initial = "", onChange = () => {}, ...rest }: { initial?: string; onChange?: (v: string) => void } & TimeProps) => {
  const [v, setV] = useState(initial);
  return (
    <TimeInput
      aria-label="Start"
      native="never"
      {...rest}
      value={v}
      onValueChange={(next) => {
        setV(next);
        onChange(next);
      }}
    />
  );
};

describe("TimeInput", () => {
  it("shows the value with a placeholder", () => {
    render(<Controlled initial="09:30" />);
    expect(screen.getByLabelText("Start")).toHaveValue("09:30");
    expect(screen.getByLabelText("Start")).toHaveAttribute("placeholder", "hh:mm");
  });

  it("commits on blur and normalizes the text", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByLabelText("Start");
    fireEvent.change(input, { target: { value: "930" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("09:30");
    expect(input).toHaveValue("09:30");
  });

  it("commits on Enter", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByLabelText("Start");
    fireEvent.change(input, { target: { value: "9.5" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("09:05");
  });

  it("rejects non-times: aria-invalid, message, keeps the old value", () => {
    const onChange = vi.fn();
    const onInvalidChange = vi.fn();
    render(<Controlled initial="09:30" onChange={onChange} onInvalidChange={onInvalidChange} />);
    const input = screen.getByLabelText("Start");
    fireEvent.change(input, { target: { value: "25:00" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid time");
    expect(onInvalidChange).toHaveBeenLastCalledWith(true, "invalid");
    expect((input as HTMLInputElement).validationMessage).toBe("Enter a valid time");
  });

  it("rejects times outside min/max", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} min="08:00" max="18:00" />);
    const input = screen.getByLabelText("Start");
    fireEvent.change(input, { target: { value: "19:00" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Time is out of range");
  });

  it("clears with empty text", () => {
    const onChange = vi.fn();
    render(<Controlled initial="09:30" onChange={onChange} />);
    const input = screen.getByLabelText("Start");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("steps with the arrow keys by `step` minutes inside min/max", () => {
    const onChange = vi.fn();
    render(<Controlled initial="09:30" onChange={onChange} step={15} max="09:50" />);
    const input = screen.getByLabelText("Start");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("09:45");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("09:50");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("09:35");
  });

  it("starts an empty field at min (or midnight) on ArrowUp", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} min="08:00" />);
    fireEvent.keyDown(screen.getByLabelText("Start"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith("08:00");
  });

  it("reads and shows 12 h in en-US", () => {
    const onChange = vi.fn();
    render(<Controlled initial="14:30" locale="en-US" onChange={onChange} />);
    const input = screen.getByLabelText("Start");
    expect(input).toHaveValue("2:30 PM");
    fireEvent.change(input, { target: { value: "9 am" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("09:00");
  });

  it("follows outside value changes", () => {
    const { rerender } = render(<TimeInput aria-label="Start" native="never" value="09:30" onValueChange={() => {}} />);
    rerender(<TimeInput aria-label="Start" native="never" value="10:45" onValueChange={() => {}} />);
    expect(screen.getByLabelText("Start")).toHaveValue("10:45");
  });

  it("native renders a time input and reports changes", () => {
    const onChange = vi.fn();
    render(<TimeInput aria-label="Start" native="always" value="" onValueChange={onChange} step={5} />);
    const input = screen.getByLabelText("Start");
    expect(input).toHaveAttribute("type", "time");
    expect(input).toHaveAttribute("step", "300");
    fireEvent.change(input, { target: { value: "10:15" } });
    expect(onChange).toHaveBeenCalledWith("10:15");
  });

  it("bare renders only the input; name submits HH:mm", () => {
    const { container } = render(<TimeInput aria-label="Start" bare name="start" value="09:30" onValueChange={() => {}} />);
    expect(container.querySelector('input[type="hidden"]')).toHaveValue("09:30");
    expect(container.querySelectorAll("div")).toHaveLength(0);
  });
});

type DtProps = Partial<React.ComponentProps<typeof DateTimeInput>>;

const DT = ({ initial = "", onChange = () => {}, ...rest }: { initial?: string; onChange?: (v: string) => void } & DtProps) => {
  const [v, setV] = useState(initial);
  return (
    <DateTimeInput
      {...rest}
      value={v}
      onValueChange={(next) => {
        setV(next);
        onChange(next);
      }}
    />
  );
};

describe("DateTimeInput", () => {
  it("shows date and time of a value", () => {
    render(<DT initial="2026-11-12T14:30" />);
    expect(screen.getByLabelText("Date")).toHaveValue("12.11.2026");
    expect(screen.getByLabelText("Time")).toHaveValue("14:30");
  });

  it("emits a local ISO datetime once both parts are there", () => {
    const onChange = vi.fn();
    render(<DT onChange={onChange} />);
    const time = screen.getByLabelText("Time");
    fireEvent.change(time, { target: { value: "1530" } });
    fireEvent.blur(time);
    expect(onChange).not.toHaveBeenCalled();
    const date = screen.getByLabelText("Date");
    fireEvent.change(date, { target: { value: "3.2.26" } });
    fireEvent.blur(date);
    expect(onChange).toHaveBeenCalledWith("2026-02-03T15:30");
  });

  it("fills the default time when only a date is typed", () => {
    const onChange = vi.fn();
    render(<DT onChange={onChange} defaultTime="09:00" />);
    const date = screen.getByLabelText("Date");
    fireEvent.change(date, { target: { value: "3.2.2026" } });
    fireEvent.blur(date);
    expect(onChange).toHaveBeenCalledWith("2026-02-03T09:00");
    expect(screen.getByLabelText("Time")).toHaveValue("09:00");
  });

  it("clearing the date clears the value", () => {
    const onChange = vi.fn();
    render(<DT initial="2026-11-12T14:30" onChange={onChange} />);
    const date = screen.getByLabelText("Date");
    fireEvent.change(date, { target: { value: "" } });
    fireEvent.blur(date);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("moves the time into min on the first day", () => {
    const onChange = vi.fn();
    render(<DT initial="2026-11-20T08:00" min="2026-11-12T10:00" onChange={onChange} />);
    const date = screen.getByLabelText("Date");
    fireEvent.change(date, { target: { value: "12.11.2026" } });
    fireEvent.blur(date);
    expect(onChange).toHaveBeenCalledWith("2026-11-12T10:00");
    expect(screen.getByLabelText("Time")).toHaveValue("10:00");
  });

  it("shows one error message and reports it", () => {
    const onInvalidChange = vi.fn();
    render(<DT initial="2026-11-12T14:30" onInvalidChange={onInvalidChange} />);
    const time = screen.getByLabelText("Time");
    fireEvent.change(time, { target: { value: "99" } });
    fireEvent.blur(time);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid time");
    expect(onInvalidChange).toHaveBeenLastCalledWith(true, "invalid");
  });

  it("follows outside resets", () => {
    const { rerender } = render(<DateTimeInput value="2026-11-12T14:30" onValueChange={() => {}} />);
    rerender(<DateTimeInput value="" onValueChange={() => {}} />);
    expect(screen.getByLabelText("Date")).toHaveValue("");
    expect(screen.getByLabelText("Time")).toHaveValue("");
  });

  it("submits the ISO datetime under `name`", () => {
    const { container } = render(<DateTimeInput name="at" value="2026-11-12T14:30" onValueChange={() => {}} />);
    expect(container.querySelector('input[name="at"]')).toHaveValue("2026-11-12T14:30");
  });
});
