import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RangeSlider } from "../../../src/patterns/range-slider/RangeSlider";
import { Slider } from "../../../src/primitives/slider";

describe("Slider", () => {
  it("renders one labelled thumb per value and steps with the keyboard", () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={[40]} max={100} step={5} thumbLabels="Volume" onValueChange={onChange} />);
    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(thumb).toHaveAttribute("aria-valuenow", "40");
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith([45]);
  });
});

describe("RangeSlider", () => {
  const Controlled = ({ onChange = () => {}, onCommit = () => {} }: { onChange?: (v: [number, number]) => void; onCommit?: (v: [number, number]) => void }) => {
    const [v, setV] = useState<[number, number]>([1000, 8000]);
    return (
      <RangeSlider
        min={0}
        max={10000}
        step={100}
        value={v}
        onValueChange={(next) => {
          setV(next);
          onChange(next);
        }}
        onValueCommit={onCommit}
      />
    );
  };

  it("shows two thumbs and formatted min/max inputs", () => {
    render(<Controlled />);
    const [low, high] = screen.getAllByRole("slider");
    expect(low).toHaveAttribute("aria-label", "Minimum");
    expect(high).toHaveAttribute("aria-valuenow", "8000");
    expect(screen.getByRole("spinbutton", { name: "Maximum" })).toHaveValue(new Intl.NumberFormat("de-CH").format(8000));
  });

  it("typing a bound updates the range and clamps a low above the high", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<Controlled onChange={onChange} onCommit={onCommit} />);
    const min = screen.getByRole("spinbutton", { name: "Minimum" });
    fireEvent.change(min, { target: { value: "2500" } });
    fireEvent.blur(min);
    expect(onChange).toHaveBeenLastCalledWith([2500, 8000]);
    expect(onCommit).toHaveBeenLastCalledWith([2500, 8000]);
    fireEvent.change(min, { target: { value: "9000" } });
    fireEvent.blur(min);
    expect(onChange).toHaveBeenLastCalledWith([8000, 8000]);
    expect(screen.getAllByRole("slider")[0]).toHaveAttribute("aria-valuenow", "8000");
  });

  it("moves a thumb with the keyboard", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const high = screen.getAllByRole("slider")[1] as HTMLElement;
    high.focus();
    fireEvent.keyDown(high, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith([1000, 7900]);
  });
});

describe("RangeSlider inputs re-sync", () => {
  const Range = () => {
    const [v, setV] = useState<[number, number]>([0, 50]);
    return <RangeSlider value={v} onValueChange={setV} min={0} max={100} data-testid="r" />;
  };

  it("refills a cleared min field and snaps an over-high min back", () => {
    render(<Range />);
    const minInput = screen.getByTestId("r-min-input");
    fireEvent.change(minInput, { target: { value: "" } });
    fireEvent.blur(minInput);
    expect(minInput).toHaveValue("0");
    fireEvent.change(minInput, { target: { value: "90" } });
    fireEvent.blur(minInput);
    expect(minInput).toHaveValue("50");
    expect(minInput).toHaveAttribute("aria-valuenow", "50");
    fireEvent.change(minInput, { target: { value: "90" } });
    fireEvent.blur(minInput);
    expect(minInput).toHaveValue("50");
  });
});
