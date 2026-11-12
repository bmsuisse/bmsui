import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultCard, ResultList, Thumbnail } from "../../../src";

describe("Thumbnail", () => {
  it("falls back when the image fails", () => {
    const { container } = render(<Thumbnail src="x.png" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
  it("shows the fallback for a null src", () => {
    const { container } = render(<Thumbnail src={null} fallback={<b>no</b>} />);
    expect(container.textContent).toBe("no");
  });
});

describe("ResultCard", () => {
  it("is a pressable button reflecting selection", () => {
    const onSelect = vi.fn();
    render(
      <ResultList aria-label="Results">
        <ResultCard title="Drill" meta="A-1" onSelect={onSelect} selected />
      </ResultList>,
    );
    const button = screen.getByRole("button", { name: /Drill/ });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalled();
    expect(screen.getByRole("list", { name: "Results" })).toBeTruthy();
  });
  it("renders a link with href", () => {
    render(
      <ResultList aria-label="r">
        <ResultCard title="Drill" href="/p/1" selected />
      </ResultList>,
    );
    const link = screen.getByRole("link", { name: "Drill" });
    expect(link.getAttribute("href")).toBe("/p/1");
    expect(link.getAttribute("aria-current")).toBe("true");
  });
  it("can be disabled and omits absent slots", () => {
    render(
      <ResultList aria-label="r">
        <ResultCard title="Drill" disabled />
      </ResultList>,
    );
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Drill");
  });
});
