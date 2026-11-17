import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Rating } from "../../../src/patterns/rating/Rating";

const Controlled = (props: Partial<React.ComponentProps<typeof Rating>> & { initial?: number }) => {
  const { initial = 0, onValueChange, ...rest } = props;
  const [v, setV] = useState(initial);
  return (
    <Rating
      aria-label="Quality"
      {...rest}
      value={v}
      onValueChange={(next) => {
        setV(next);
        onValueChange?.(next);
      }}
    />
  );
};

describe("Rating", () => {
  it("is a radiogroup of max radios with one tab stop", () => {
    render(<Controlled initial={3} />);
    expect(screen.getByRole("radiogroup", { name: "Quality" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    expect(radios.filter((r) => r.tabIndex === 0)).toEqual([radios[2]]);
    expect(radios[0]).toHaveAccessibleName("1 of 5 stars");
  });

  it("the first star is the tab stop while unrated", () => {
    render(<Controlled />);
    expect(screen.getAllByRole("radio")[0]).toHaveAttribute("tabindex", "0");
  });

  it("selects on click and previews on hover", () => {
    const onValueChange = vi.fn();
    render(<Controlled onValueChange={onValueChange} />);
    const radios = screen.getAllByRole("radio");
    fireEvent.mouseEnter(radios[3]!);
    expect(screen.getByTestId("rating-fill-4")).toHaveStyle({ width: "100%" });
    expect(screen.getByTestId("rating-fill-5")).toHaveStyle({ width: "0%" });
    fireEvent.click(radios[3]!);
    expect(onValueChange).toHaveBeenCalledWith(4);
    fireEvent.mouseLeave(screen.getByRole("radiogroup"));
    expect(screen.getByTestId("rating-fill-4")).toHaveStyle({ width: "100%" });
  });

  it("moves with the arrow keys, Home and End", () => {
    const onValueChange = vi.fn();
    render(<Controlled initial={3} onValueChange={onValueChange} />);
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    fireEvent.keyDown(group, { key: "Home" });
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(group, { key: "End" });
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    expect(screen.getAllByRole("radio")[4]).toHaveFocus();
  });

  it("does not go below one star", () => {
    const onValueChange = vi.fn();
    render(<Controlled initial={1} onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowLeft" });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("allowHalf doubles the choices and steps by 0.5", () => {
    const onValueChange = vi.fn();
    render(<Controlled initial={2} allowHalf onValueChange={onValueChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(10);
    expect(screen.getByRole("radio", { name: "3.5 of 5 stars" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenLastCalledWith(2.5);
    expect(screen.getByTestId("rating-fill-3")).toHaveStyle({ width: "50%" });
    fireEvent.click(screen.getByRole("radio", { name: "4.5 of 5 stars" }));
    expect(onValueChange).toHaveBeenLastCalledWith(4.5);
  });

  it("allowClear: clicking the current value or Backspace resets to 0", () => {
    const onValueChange = vi.fn();
    render(<Controlled initial={3} allowClear onValueChange={onValueChange} />);
    fireEvent.click(screen.getAllByRole("radio")[2]!);
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    expect(screen.getAllByRole("radio")[0]).toHaveAttribute("tabindex", "0");
  });

  it("readOnly is a single image with the value as its name, half stars included", () => {
    render(<Rating aria-label="Average" readOnly value={3.5} />);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByRole("img", { name: "Average: 3.5 out of 5" })).toBeInTheDocument();
    expect(screen.getByTestId("rating-fill-4")).toHaveStyle({ width: "50%" });
  });

  it("readOnly without a value says so; disabled blocks interaction", () => {
    const { rerender } = render(<Rating readOnly value={0} labels={{ unrated: "No reviews" }} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Rating: No reviews");
    rerender(<Rating disabled value={2} />);
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("works uncontrolled and submits under `name`", () => {
    const { container } = render(<Rating name="stars" defaultValue={2} />);
    fireEvent.click(screen.getAllByRole("radio")[3]!);
    expect(container.querySelector('input[name="stars"]')).toHaveValue("4");
  });

  it("takes labels", () => {
    render(<Rating labels={{ star: (v, m) => `${v} von ${m}`, rating: "Bewertung" }} />);
    expect(screen.getByRole("radiogroup", { name: "Bewertung" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "2 von 5" })).toBeInTheDocument();
  });
});
