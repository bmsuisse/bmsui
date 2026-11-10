import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RadioList } from "../../../src/patterns/radio-list/RadioList";
import { RadioGroup, RadioGroupItem } from "../../../src/primitives/radio-group";

const options = [
  { value: "standard", label: "Standard", description: "3–5 days" },
  { value: "express", label: "Express", description: "Next day" },
  { value: "pickup", label: "Pick-up", disabled: true },
];

describe("RadioGroup primitive", () => {
  it("checks items via Radix", () => {
    const onChange = vi.fn();
    render(
      <RadioGroup aria-label="Size" defaultValue="s" onValueChange={onChange}>
        <RadioGroupItem value="s" aria-label="S" />
        <RadioGroupItem value="m" aria-label="M" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radio", { name: "S" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "M" }));
    expect(onChange).toHaveBeenCalledWith("m");
  });
});

describe("RadioList", () => {
  it("labels each radio and links its description", () => {
    render(<RadioList aria-label="Shipping" options={options} value="standard" onValueChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Shipping" })).toBeInTheDocument();
    const express = screen.getByRole("radio", { name: "Express" });
    expect(express).toHaveAccessibleDescription("Next day");
    expect(screen.getByRole("radio", { name: "Standard" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Pick-up" })).toBeDisabled();
  });

  it("selects by clicking the label text (card variant too)", () => {
    const onChange = vi.fn();
    const Controlled = () => {
      const [v, setV] = useState<string>("");
      return (
        <RadioList
          data-testid="ship"
          variant="card"
          options={options}
          value={v}
          onValueChange={(next) => {
            setV(next);
            onChange(next);
          }}
        />
      );
    };
    render(<Controlled />);
    fireEvent.click(screen.getByText("Next day"));
    expect(onChange).toHaveBeenCalledWith("express");
    expect(screen.getByRole("radio", { name: "Express" })).toBeChecked();
    expect(screen.getByTestId("ship-option-express")).toBeInTheDocument();
  });
});
