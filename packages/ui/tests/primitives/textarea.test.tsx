import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Textarea } from "../../src/primitives/textarea";

describe("Textarea autoResize", () => {
  it("forwards its ref and starts at one row", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} autoResize />);
    expect(ref.current).toBe(screen.getByRole("textbox"));
    expect(screen.getByRole("textbox")).toHaveAttribute("rows", "1");
    expect(screen.getByRole("textbox").className).toContain("resize-none");
  });

  it("sets an explicit height from scrollHeight on input", () => {
    render(<Textarea autoResize />);
    const el = screen.getByRole("textbox") as HTMLTextAreaElement;
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: 120 });
    fireEvent.input(el, { target: { value: "a\nb\nc" } });
    expect(el.style.height).toBe("120px");
  });

  it("caps at maxRows and scrolls", () => {
    const original = window.getComputedStyle;
    window.getComputedStyle = ((node: Element) => {
      const style = original(node);
      return new Proxy(style, {
        get: (target, prop) =>
          prop === "lineHeight" ? "20px" : prop === "paddingTop" || prop === "paddingBottom" ? "4px" : Reflect.get(target, prop),
      });
    }) as typeof window.getComputedStyle;
    try {
      render(<Textarea autoResize maxRows={3} />);
      const el = screen.getByRole("textbox") as HTMLTextAreaElement;
      Object.defineProperty(el, "scrollHeight", { configurable: true, value: 500 });
      fireEvent.input(el);
      expect(el.style.height).toBe("68px");
      expect(el.style.overflowY).toBe("auto");
    } finally {
      window.getComputedStyle = original;
    }
  });

  it("does nothing without autoResize", () => {
    render(<Textarea />);
    const el = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.input(el);
    expect(el.style.height).toBe("");
  });
});
