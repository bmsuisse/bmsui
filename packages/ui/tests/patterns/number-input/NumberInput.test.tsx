import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { numberSymbols } from "../../../src/lib/numberField";
import { NumberInput, type NumberInputProps } from "../../../src/patterns/number-input/NumberInput";

const Controlled = ({
  initial = null,
  onChange = () => {},
  ...props
}: { initial?: number | null; onChange?: (v: number | null) => void } & Partial<NumberInputProps>) => {
  const [v, setV] = useState<number | null>(initial);
  return (
    <NumberInput
      aria-label="Amount"
      {...props}
      value={v}
      onValueChange={(next) => {
        setV(next);
        onChange(next);
      }}
    />
  );
};

// ICU versions differ on the Swiss group mark (' vs ’).
const G = numberSymbols("de-CH").group;

describe("NumberInput", () => {
  it("shows the value with de-CH grouping and fixed decimals", () => {
    render(<Controlled initial={1234.5} decimals={2} />);
    expect(screen.getByLabelText("Amount")).toHaveValue(`1${G}234.50`);
  });

  it("accepts a decimal comma and commits on blur, not while typing", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "1234,5" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(1234.5);
    expect(input).toHaveValue(`1${G}234.5`);
  });

  it("commits on Enter and clamps to min/max", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} min={0} max={100} />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "250" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(100);
    expect(input).toHaveValue("100");
  });

  it("marks junk invalid and keeps the previous value", () => {
    const onChange = vi.fn();
    const onInvalid = vi.fn();
    render(<Controlled initial={5} onChange={onChange} onInvalidChange={onInvalid} />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "five" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onInvalid).toHaveBeenLastCalledWith(true);
    fireEvent.change(input, { target: { value: "6" } });
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("clears to null", () => {
    const onChange = vi.fn();
    render(<Controlled initial={3} onChange={onChange} />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("steps with ArrowUp/ArrowDown (Shift ×10) without float noise", () => {
    const onChange = vi.fn();
    render(<Controlled initial={0.1} step={0.2} onChange={onChange} />);
    const input = screen.getByLabelText("Amount");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(0.3);
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(-1.7);
  });

  it("stepper buttons step and disable at the bounds", () => {
    const onChange = vi.fn();
    render(<Controlled initial={9} max={10} stepper onChange={onChange} labels={{ increment: "Mehr" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Mehr" }));
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(screen.getByRole("button", { name: "Mehr" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Decrease" }));
    expect(onChange).toHaveBeenLastCalledWith(9);
  });

  it("exposes spinbutton semantics and a hidden form value", () => {
    const { container } = render(<Controlled initial={42} min={0} max={99} name="qty" />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("aria-valuenow", "42");
    expect(input).toHaveAttribute("aria-valuemax", "99");
    expect(container.querySelector('input[type="hidden"][name="qty"]')).toHaveValue("42");
  });

  it("forwards the ref to the input", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<NumberInput ref={ref} value={1} onValueChange={() => {}} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe("NumberInput review fixes", () => {
  it("re-syncs the text after a commit the parent clamps back to the same value", () => {
    const Clamped = () => {
      const [v, setV] = useState<number | null>(50);
      return <NumberInput aria-label="Min" value={v} onValueChange={(n) => setV(Math.min(n ?? 0, 50))} />;
    };
    render(<Clamped />);
    const input = screen.getByLabelText("Min");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "90" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("50");
    expect(input).toHaveAttribute("aria-valuenow", "50");
  });

  it("refills a cleared field the parent keeps at the same number", () => {
    const Fixed = () => {
      const [v, setV] = useState<number | null>(0);
      return <NumberInput aria-label="Min" value={v} onValueChange={(n) => setV(n ?? 0)} />;
    };
    render(<Fixed />);
    const input = screen.getByLabelText("Min");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("0");
  });

  it("parses its own currency display and rounds 1.005 to 1.01", () => {
    const onChange = vi.fn();
    render(
      <Controlled initial={1234.5} onChange={onChange} decimals={2} formatOptions={{ style: "currency", currency: "CHF" }} />,
    );
    const input = screen.getByLabelText("Amount");
    const shown = (input as HTMLInputElement).value;
    expect(shown.replace(/\s/g, " ")).toBe(`CHF 1${G}234.50`);
    fireEvent.change(input, { target: { value: shown } });
    fireEvent.blur(input);
    expect(input).not.toHaveAttribute("aria-invalid");
    fireEvent.change(input, { target: { value: "1.005" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(1.01);
  });
});
