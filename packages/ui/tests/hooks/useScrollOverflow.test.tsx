import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { measureScrollOverflow, useScrollOverflow } from "../../src/hooks/useScrollOverflow";

function setGeometry(
  el: HTMLElement,
  g: { scrollHeight?: number; clientHeight?: number; scrollWidth?: number; clientWidth?: number },
) {
  for (const [key, value] of Object.entries(g)) {
    Object.defineProperty(el, key, { value, configurable: true });
  }
}

function Scroller() {
  const { ref, top, bottom, left, right } = useScrollOverflow<HTMLDivElement>();
  return (
    <>
      <div ref={ref} data-testid="scroller" />
      <output data-testid="flags">{JSON.stringify({ top, bottom, left, right })}</output>
    </>
  );
}

const flags = () => JSON.parse(screen.getByTestId("flags").textContent ?? "{}");

describe("useScrollOverflow", () => {
  it("reports edges with hidden content and updates on scroll", () => {
    render(<Scroller />);
    const el = screen.getByTestId("scroller");
    setGeometry(el, { scrollHeight: 500, clientHeight: 100, scrollWidth: 100, clientWidth: 100 });
    fireEvent.scroll(el);
    expect(flags()).toEqual({ top: false, bottom: true, left: false, right: false });

    el.scrollTop = 200;
    fireEvent.scroll(el);
    expect(flags()).toEqual({ top: true, bottom: true, left: false, right: false });

    el.scrollTop = 400;
    fireEvent.scroll(el);
    expect(flags()).toEqual({ top: true, bottom: false, left: false, right: false });
  });

  it("re-measures when children change", async () => {
    render(<Scroller />);
    const el = screen.getByTestId("scroller");
    setGeometry(el, { scrollHeight: 100, clientHeight: 100, scrollWidth: 300, clientWidth: 100 });
    await act(async () => {
      el.appendChild(document.createElement("span"));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(flags()).toEqual({ top: false, bottom: false, left: false, right: true });
  });

  it("measures horizontal overflow, RTL-aware", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    setGeometry(el, { scrollHeight: 0, clientHeight: 0, scrollWidth: 300, clientWidth: 100 });
    el.scrollLeft = 50;
    expect(measureScrollOverflow(el)).toEqual({ top: false, bottom: false, left: true, right: true });
    el.style.direction = "rtl";
    el.scrollLeft = 0;
    expect(measureScrollOverflow(el)).toEqual({ top: false, bottom: false, left: true, right: false });
    el.remove();
  });
});
