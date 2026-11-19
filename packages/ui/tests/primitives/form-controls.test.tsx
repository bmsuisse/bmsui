import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../src/primitives/button";
import { Checkbox } from "../../src/primitives/checkbox";
import { RadioGroup, RadioGroupItem } from "../../src/primitives/radio-group";
import { Separator } from "../../src/primitives/separator";
import { Slider } from "../../src/primitives/slider";
import { Switch } from "../../src/primitives/switch";

// The Base UI port keeps Radix's public contract: data-state, label/id wiring, form values, asChild.
describe("Radix contract after the Base UI port", () => {
  it("Button asChild merges class, handlers and ref onto the child; a plain Button keeps the form's submit default", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button asChild variant="outline" onClick={outer} ref={ref}>
        <a href="#go" className="own" onClick={inner}>
          Go
        </a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link.className).toContain("own");
    expect(link.className).toContain("border-input");
    expect(ref.current).toBe(link);
    fireEvent.click(link);
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).toHaveBeenCalledOnce();

    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute("type");
  });

  it("Checkbox and Switch set data-state, follow a Label's htmlFor and submit their value", () => {
    const onSwitch = vi.fn();
    const { container } = render(
      <form>
        <Checkbox id="c" name="agree" defaultChecked />
        <label htmlFor="s">Notify</label>
        <Switch id="s" name="notify" onCheckedChange={onSwitch} />
      </form>,
    );
    const box = screen.getByRole("checkbox");
    expect(box).toHaveAttribute("id", "c");
    expect(box).toHaveAttribute("data-state", "checked");
    const toggle = screen.getByRole("switch", { name: "Notify" });
    expect(toggle).toHaveAttribute("data-state", "unchecked");
    fireEvent.click(screen.getByText("Notify"));
    expect(onSwitch).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("data-state", "checked");
    const data = new FormData(container.querySelector("form") as HTMLFormElement);
    expect(data.get("agree")).toBe("on");
    expect(data.get("notify")).toBe("on");
  });

  it("RadioGroupItem carries data-state and the group reports a string value", () => {
    const onChange = vi.fn();
    render(
      <RadioGroup defaultValue="a" onValueChange={onChange} aria-label="Pick">
        <RadioGroupItem value="a" aria-label="A" />
        <RadioGroupItem value="b" aria-label="B" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radio", { name: "A" })).toHaveAttribute("data-state", "checked");
    fireEvent.click(screen.getByRole("radio", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("radio", { name: "B" })).toHaveAttribute("data-state", "checked");
  });

  it("Separator is decorative by default and a separator when not", () => {
    render(
      <>
        <Separator data-testid="deco" />
        <Separator data-testid="real" decorative={false} orientation="vertical" />
      </>,
    );
    const deco = screen.getByTestId("deco");
    expect(deco).toHaveAttribute("role", "none");
    expect(deco).not.toHaveAttribute("aria-orientation");
    expect(deco).toHaveAttribute("data-orientation", "horizontal");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("Slider PageUp steps ten steps", () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={[10]} step={2} thumbLabels="Level" onValueChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("slider", { name: "Level" }), { key: "PageUp" });
    expect(onChange).toHaveBeenCalledWith([30]);
  });
});
