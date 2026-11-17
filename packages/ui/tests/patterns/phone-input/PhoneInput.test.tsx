import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { formatSwissPhone, normalizePhone } from "../../../src/lib/swissPhone";
import { FormField } from "../../../src/patterns/form-field/FormField";
import { PhoneInput } from "../../../src/patterns/phone-input/PhoneInput";

describe("swissPhone", () => {
  it("formats every Swiss spelling the same", () => {
    for (const v of [
      "0791234567",
      "079 123 45 67",
      "0041791234567",
      "0041 79 123 45 67",
      "+41791234567",
      "+41 79 123 45 67",
      "+41 (0)79 123 45 67",
      "079/123.45.67",
      "(079) 123-45-67",
    ]) {
      expect(formatSwissPhone(v)).toBe("+41 79 123 45 67");
    }
    expect(formatSwissPhone("  044 123 45 67 ")).toBe("+41 44 123 45 67");
  });

  it("leaves everything else alone", () => {
    expect(formatSwissPhone("+49 30 123456")).toBe("+49 30 123456");
    expect(formatSwissPhone("079 123 45")).toBe("079 123 45");
    expect(formatSwissPhone("07912345678")).toBe("07912345678");
    expect(formatSwissPhone("+41 79 123 45 678")).toBe("+41 79 123 45 678");
    expect(formatSwissPhone("call me")).toBe("call me");
    expect(formatSwissPhone("")).toBe("");
  });

  it("normalizePhone also trims and collapses spaces on other numbers", () => {
    expect(normalizePhone("079 123 45 67")).toBe("+41 79 123 45 67");
    expect(normalizePhone("  +49   30  123456 ")).toBe("+49 30 123456");
    expect(normalizePhone("   ")).toBe("");
  });
});

const Controlled = ({ onChange = () => {} }: { onChange?: (v: string) => void }) => {
  const [v, setV] = useState("");
  return (
    <PhoneInput
      aria-label="Mobile"
      value={v}
      onValueChange={(next) => {
        setV(next);
        onChange(next);
      }}
    />
  );
};

describe("PhoneInput", () => {
  it("has tel semantics and a default placeholder", () => {
    render(<Controlled />);
    const input = screen.getByLabelText("Mobile");
    expect(input).toHaveAttribute("type", "tel");
    expect(input).toHaveAttribute("inputmode", "tel");
    expect(input).toHaveAttribute("autocomplete", "tel");
    expect(input).toHaveAttribute("placeholder", "079 000 00 00");
  });

  it("does not touch the text while typing, normalizes Swiss numbers on blur", () => {
    render(<Controlled />);
    const input = screen.getByLabelText("Mobile");
    fireEvent.change(input, { target: { value: "0791234567" } });
    expect(input).toHaveValue("0791234567");
    fireEvent.blur(input);
    expect(input).toHaveValue("+41 79 123 45 67");
  });

  it("leaves a non-Swiss number as typed", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByLabelText("Mobile");
    fireEvent.change(input, { target: { value: "+49 171 1234567" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("+49 171 1234567");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("normalizes on Enter too and works uncontrolled", () => {
    const onValueChange = vi.fn();
    render(<PhoneInput aria-label="Mobile" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Mobile");
    fireEvent.change(input, { target: { value: "0041791234567" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("+41 79 123 45 67");
    expect(onValueChange).toHaveBeenLastCalledWith("+41 79 123 45 67");
  });

  it("calls the caller's onBlur and `normalize` can switch it off", () => {
    const onBlur = vi.fn();
    render(<PhoneInput aria-label="Mobile" defaultValue="0791234567" normalize={(v) => v} onBlur={onBlur} />);
    const input = screen.getByLabelText("Mobile");
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalled();
    expect(input).toHaveValue("0791234567");
  });

  it("works inside FormField", () => {
    render(
      <FormField label="Mobile" error="Invalid number">
        <PhoneInput value="" onValueChange={() => {}} />
      </FormField>,
    );
    const input = screen.getByLabelText("Mobile");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Invalid number");
  });
});
