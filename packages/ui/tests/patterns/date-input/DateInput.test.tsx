import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { datePlaceholder, formatIsoDay, parseIsoDay, toLocalIsoDay } from "../../../src/lib/dateField";
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
    expect(onInvalidChange).toHaveBeenLastCalledWith(true);
    fireEvent.change(input, { target: { value: "1.1.2026" } });
    expect(onInvalidChange).toHaveBeenLastCalledWith(false);
  });

  it("with name, submits the ISO day via a hidden input", () => {
    const { container } = render(<DateInput aria-label="d" name="due" value="2026-11-10" onValueChange={() => {}} />);
    expect(container.querySelector('input[type="hidden"][name="due"]')).toHaveValue("2026-11-10");
    expect(screen.getByLabelText("d")).not.toHaveAttribute("name");
  });
});
