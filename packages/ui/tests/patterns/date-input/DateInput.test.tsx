import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { datePlaceholder, formatIsoDay, parseIsoDay, shiftIsoDay, toLocalIsoDay } from "../../../src/lib/dateField";
import { DateInput } from "../../../src/patterns/date-input/DateInput";

describe("dateField", () => {
  it("formats ISO days in the locale's order", () => {
    expect(formatIsoDay("2026-02-03", "de-CH")).toBe("03.02.2026");
    expect(formatIsoDay("2026-02-03", "en-US")).toBe("02/03/2026");
    expect(formatIsoDay("not a date", "de-CH")).toBe("");
  });

  it("builds placeholders", () => {
    expect(datePlaceholder("de-CH")).toBe("dd.mm.yyyy");
    expect(datePlaceholder("en-US")).toBe("mm/dd/yyyy");
  });

  it("parses locale text, short years, other separators and ISO", () => {
    expect(parseIsoDay("3.2.2026", "de-CH")).toBe("2026-02-03");
    expect(parseIsoDay("3.2.26", "de-CH")).toBe("2026-02-03");
    expect(parseIsoDay("03/02/2026", "de-CH")).toBe("2026-02-03");
    expect(parseIsoDay("2/3/2026", "en-US")).toBe("2026-02-03");
    expect(parseIsoDay("2026-2-3", "de-CH")).toBe("2026-02-03");
  });

  it("accepts bare digits, spaced separators and ISO datetimes; pivots two-digit years", () => {
    expect(parseIsoDay("03022026", "de-CH")).toBe("2026-02-03");
    expect(parseIsoDay("030226", "de-CH")).toBe("2026-02-03");
    expect(parseIsoDay("3. 2. 2026", "de-CH")).toBe("2026-02-03");
    expect(parseIsoDay("2026-02-03T10:00:00Z", "de-CH")).toBe("2026-02-03");
    expect(parseIsoDay("1.2.99", "de-CH")).toBe("1999-02-01");
    expect(formatIsoDay("2026-02-03T00:00:00Z", "de-CH")).toBe("03.02.2026");
  });

  it("rejects impossible dates and junk", () => {
    expect(parseIsoDay("31.02.2026", "de-CH")).toBeNull();
    expect(parseIsoDay("hello", "de-CH")).toBeNull();
    expect(parseIsoDay("1.1.99999", "de-CH")).toBeNull();
  });

  it("toLocalIsoDay uses the local calendar day", () => {
    expect(toLocalIsoDay(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

const Controlled = ({ initial = "", onChange = () => {} }: { initial?: string; onChange?: (v: string) => void }) => {
  const [v, setV] = useState(initial);
  return (
    <DateInput
      aria-label="Due"
      value={v}
      onValueChange={(next) => {
        setV(next);
        onChange(next);
      }}
    />
  );
};

describe("shiftIsoDay", () => {
  it("moves by days across month and year ends", () => {
    expect(shiftIsoDay("2026-11-30", { days: 1 })).toBe("2026-12-01");
    expect(shiftIsoDay("2026-01-01", { days: -1 })).toBe("2025-12-31");
  });

  it("moves by months, clamping to the month's last day", () => {
    expect(shiftIsoDay("2026-01-31", { months: 1 })).toBe("2026-02-28");
    expect(shiftIsoDay("2024-01-31", { months: 1 })).toBe("2024-02-29");
    expect(shiftIsoDay("2026-01-15", { months: -1 })).toBe("2025-12-15");
    expect(shiftIsoDay("2026-03-15", { months: 12 })).toBe("2027-03-15");
  });

  it("leaves non-ISO input and out-of-range years alone", () => {
    expect(shiftIsoDay("junk", { days: 1 })).toBe("junk");
    expect(shiftIsoDay("1000-01-01", { days: -1 })).toBe("1000-01-01");
  });
});

describe("DateInput", () => {
  it("shows the value in de-CH by default with a placeholder", () => {
    render(<Controlled initial="2026-11-10" />);
    const input = screen.getByLabelText("Due");
    expect(input).toHaveValue("10.11.2026");
    expect(input).toHaveAttribute("placeholder", "dd.mm.yyyy");
  });

  it("commits on blur and normalizes the text", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByLabelText("Due");
    fireEvent.change(input, { target: { value: "1.3.26" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("2026-03-01");
    expect(input).toHaveValue("01.03.2026");
  });

  it("commits on Enter", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByLabelText("Due");
    fireEvent.change(input, { target: { value: "2026-12-24" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("2026-12-24");
  });

  it("marks invalid text and keeps the old value", () => {
    const onChange = vi.fn();
    render(<Controlled initial="2026-11-10" onChange={onChange} />);
    const input = screen.getByLabelText("Due");
    fireEvent.change(input, { target: { value: "31.02.2026" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(input, { target: { value: "1.1.2027" } });
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("clearing the text clears the value", () => {
    const onChange = vi.fn();
    render(<Controlled initial="2026-11-10" onChange={onChange} />);
    const input = screen.getByLabelText("Due");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("still calls the caller's onBlur", () => {
    const onBlur = vi.fn();
    render(<DateInput aria-label="d" value="" onValueChange={() => {}} onBlur={onBlur} />);
    fireEvent.blur(screen.getByLabelText("d"));
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it("focus + blur without typing never changes the value", () => {
    const onChange = vi.fn();
    render(<Controlled initial="2026-01-05T00:00:00Z" onChange={onChange} />);
    const input = screen.getByLabelText("Due");
    expect(input).toHaveValue("05.01.2026");
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("an outside value change doesn't overwrite text being typed", () => {
    const { rerender } = render(<DateInput aria-label="d" value="2026-01-01" onValueChange={() => {}} />);
    const input = screen.getByLabelText("d");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "7.3.20" } });
    rerender(<DateInput aria-label="d" value="2026-06-06" onValueChange={() => {}} />);
    expect(input).toHaveValue("7.3.20");
  });

  it("reports validity changes", () => {
    const onInvalidChange = vi.fn();
    render(<DateInput aria-label="d" value="" onValueChange={() => {}} onInvalidChange={onInvalidChange} />);
    const input = screen.getByLabelText("d");
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.blur(input);
    expect(onInvalidChange).toHaveBeenLastCalledWith(true, "invalid");
    fireEvent.change(input, { target: { value: "1.1.2026" } });
    expect(onInvalidChange).toHaveBeenLastCalledWith(false, undefined);
  });

  it("with name, submits the ISO day via a hidden input", () => {
    const { container } = render(<DateInput aria-label="d" name="due" value="2026-11-10" onValueChange={() => {}} />);
    expect(container.querySelector('input[type="hidden"][name="due"]')).toHaveValue("2026-11-10");
    expect(screen.getByLabelText("d")).not.toHaveAttribute("name");
  });
});

describe("DateInput min/max and invalid state", () => {
  const setup = (props: Partial<ComponentProps<typeof DateInput>> = {}) => {
    const onChange = vi.fn();
    const onInvalidChange = vi.fn();
    render(
      <form data-testid="form">
        <DateInput
          aria-label="d"
          value="2026-11-10"
          onValueChange={onChange}
          onInvalidChange={onInvalidChange}
          min="2026-11-01"
          max="2026-11-30"
          native="never"
          {...props}
        />
      </form>,
    );
    return { input: screen.getByLabelText("d") as HTMLInputElement, onChange, onInvalidChange };
  };

  it("rejects dates outside min/max: not reported, flagged, with a message", () => {
    const { input, onChange, onInvalidChange } = setup();
    fireEvent.change(input, { target: { value: "1.12.2026" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onInvalidChange).toHaveBeenLastCalledWith(true, "range");
    expect(screen.getByRole("alert")).toHaveTextContent("Date is out of range");
    expect(input).toHaveAttribute("aria-describedby", screen.getByRole("alert").id);
  });

  it("accepts the bounds themselves", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "30.11.2026" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("2026-11-30");
  });

  it("shows a message for non-dates, translatable, and can hide it", () => {
    const { input } = setup({ labels: { invalid: "Kein Datum" } });
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent("Kein Datum");
  });

  it("showError={false} renders no message but still flags the field", () => {
    const { input } = setup({ showError: false });
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.blur(input);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the message once the text is fixed", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "5.11.2026" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sets native validity while the text is unusable, so a form can't submit it", () => {
    const { input } = setup();
    expect(input.validity.valid).toBe(true);
    fireEvent.change(input, { target: { value: "31.02.2026" } });
    expect(input.validity.customError).toBe(true);
    expect(input.checkValidity()).toBe(false);
    fireEvent.change(input, { target: { value: "5.11.2026" } });
    expect(input.checkValidity()).toBe(true);
    fireEvent.change(input, { target: { value: "5.12.2026" } });
    expect(input.checkValidity()).toBe(false);
  });

  it("the calendar picker gets min/max and doesn't take part in form validation", () => {
    setup();
    const picker = screen.getByTestId("date-input-picker");
    expect(picker).toHaveAttribute("min", "2026-11-01");
    expect(picker).toHaveAttribute("max", "2026-11-30");
    expect(picker).toHaveAttribute("form", "bmsui-date-input-picker");
  });

  it("the calendar button opens the native picker; picking a day commits it", () => {
    const { input, onChange } = setup();
    const picker = screen.getByTestId("date-input-picker") as HTMLInputElement;
    const showPicker = vi.fn();
    picker.showPicker = showPicker;
    fireEvent.click(screen.getByRole("button", { name: "Choose date" }));
    expect(showPicker).toHaveBeenCalledOnce();
    fireEvent.change(picker, { target: { value: "2026-11-24" } });
    expect(onChange).toHaveBeenCalledWith("2026-11-24");
    expect(input).toHaveValue("24.11.2026");
  });

  it("falls back to a click when showPicker is missing or throws", () => {
    setup();
    const picker = screen.getByTestId("date-input-picker") as HTMLInputElement;
    picker.showPicker = () => {
      throw new Error("nope");
    };
    const click = vi.spyOn(picker, "click");
    fireEvent.click(screen.getByRole("button", { name: "Choose date" }));
    expect(click).toHaveBeenCalledOnce();
  });

  it("has no calendar button when disabled or read-only", () => {
    setup({ disabled: true });
    expect(screen.queryByRole("button", { name: "Choose date" })).not.toBeInTheDocument();
  });

  it("steps with the arrow keys and clamps to min/max", () => {
    const { input, onChange } = setup();
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("2026-11-11");
    fireEvent.keyDown(input, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith("2026-11-01");
    fireEvent.keyDown(input, { key: "PageUp", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith("2026-11-30");
  });

  it("an empty field starts at today on the first arrow press", () => {
    const { input, onChange } = setup({ value: "", min: undefined, max: undefined });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(onChange).toHaveBeenCalledWith(today);
  });

  it("Alt+ArrowDown opens the picker and doesn't step", () => {
    const { input, onChange } = setup();
    const picker = screen.getByTestId("date-input-picker") as HTMLInputElement;
    picker.showPicker = vi.fn();
    fireEvent.keyDown(input, { key: "ArrowDown", altKey: true });
    expect(picker.showPicker).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("DateInput native mode", () => {
  const setup = (props: Partial<ComponentProps<typeof DateInput>> = {}) => {
    const onChange = vi.fn();
    const onInvalidChange = vi.fn();
    const utils = render(
      <DateInput
        aria-label="d"
        value="2026-11-10"
        onValueChange={onChange}
        onInvalidChange={onInvalidChange}
        min="2026-11-01"
        max="2026-11-30"
        native="always"
        {...props}
      />,
    );
    return { input: screen.getByLabelText("d") as HTMLInputElement, onChange, onInvalidChange, ...utils };
  };

  it("renders a native date input with the ISO value and bounds", () => {
    const { input } = setup();
    expect(input).toHaveAttribute("type", "date");
    expect(input).toHaveValue("2026-11-10");
    expect(input).toHaveAttribute("min", "2026-11-01");
    expect(input).toHaveAttribute("max", "2026-11-30");
    expect(screen.queryByRole("button", { name: "Choose date" })).not.toBeInTheDocument();
  });

  it("reports picked days", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "2026-11-20" } });
    expect(onChange).toHaveBeenCalledWith("2026-11-20");
  });

  it("reports a cleared field", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("doesn't report out-of-range days; flags them with a message", () => {
    const { input, onChange, onInvalidChange } = setup();
    fireEvent.change(input, { target: { value: "2026-12-05" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onInvalidChange).toHaveBeenLastCalledWith(true, "range");
    expect(screen.getByRole("alert")).toHaveTextContent("Date is out of range");
    fireEvent.change(input, { target: { value: "2026-11-05" } });
    expect(onChange).toHaveBeenCalledWith("2026-11-05");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("follows outside value changes", () => {
    const { input, rerender } = setup();
    rerender(<DateInput aria-label="d" value="2026-11-22" onValueChange={() => {}} native="always" />);
    expect(input).toHaveValue("2026-11-22");
  });

  it("with name, submits the ISO day via a hidden input", () => {
    const { container } = setup({ name: "due" });
    expect(container.querySelector('input[type="hidden"][name="due"]')).toHaveValue("2026-11-10");
  });

  it("auto: native on touch devices, typed otherwise", () => {
    const original = window.matchMedia;
    const stub = (matches: boolean) => {
      window.matchMedia = ((query: string) => ({
        matches: query === "(pointer: coarse)" && matches,
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia;
    };
    try {
      stub(true);
      const touch = render(<DateInput aria-label="t" value="2026-11-10" onValueChange={() => {}} />);
      expect(screen.getByLabelText("t")).toHaveAttribute("type", "date");
      touch.unmount();
      stub(false);
      render(<DateInput aria-label="m" value="2026-11-10" onValueChange={() => {}} />);
      expect(screen.getByLabelText("m")).toHaveAttribute("type", "text");
    } finally {
      window.matchMedia = original;
    }
  });

  it("native=never stays typed even on touch devices", () => {
    const original = window.matchMedia;
    window.matchMedia = (() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    try {
      render(<DateInput aria-label="n" value="" onValueChange={() => {}} native="never" />);
      expect(screen.getByLabelText("n")).toHaveAttribute("type", "text");
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("DateInput isDateDisabled", () => {
  const weekend = (iso: string) => [0, 6].includes(new Date(`${iso}T12:00:00`).getDay());

  it("rejects blocked typed days with a message and the 'disabled' reason", () => {
    const onChange = vi.fn();
    const onInvalidChange = vi.fn();
    render(
      <DateInput
        aria-label="d"
        value="2026-11-10"
        onValueChange={onChange}
        onInvalidChange={onInvalidChange}
        isDateDisabled={weekend}
        native="never"
      />,
    );
    const input = screen.getByLabelText("d");
    fireEvent.change(input, { target: { value: "14.11.2026" } }); // Saturday
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(onInvalidChange).toHaveBeenLastCalledWith(true, "disabled");
    expect(screen.getByRole("alert")).toHaveTextContent("Date is not available");
    expect((input as HTMLInputElement).checkValidity()).toBe(false);
  });

  it("arrow steps hop over blocked days", () => {
    const onChange = vi.fn();
    render(<DateInput aria-label="d" value="2026-11-13" onValueChange={onChange} isDateDisabled={weekend} native="never" />);
    fireEvent.keyDown(screen.getByLabelText("d"), { key: "ArrowUp" }); // Fri -> (Sat, Sun) -> Mon
    expect(onChange).toHaveBeenCalledWith("2026-11-16");
  });

  it("a day picked in the browser's calendar is judged like typed text", () => {
    const onChange = vi.fn();
    render(<DateInput aria-label="d" value="2026-11-10" onValueChange={onChange} isDateDisabled={weekend} native="never" />);
    const picker = screen.getByTestId("date-input-picker");
    fireEvent.change(picker, { target: { value: "2026-11-14" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("d")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("d")).toHaveValue("14.11.2026");
  });

  it("native mode rejects blocked days too", () => {
    const onChange = vi.fn();
    render(<DateInput aria-label="d" value="2026-11-10" onValueChange={onChange} isDateDisabled={weekend} native="always" />);
    fireEvent.change(screen.getByLabelText("d"), { target: { value: "2026-11-14" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Date is not available");
  });
});

