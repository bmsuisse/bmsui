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

describe("Thumbnail src change", () => {
  it("shows the new image after the previous one failed", () => {
    const { container, rerender } = render(<Thumbnail src="a.png" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    rerender(<Thumbnail src="b.png" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("b.png");
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
    expect(button.getAttribute("aria-current")).toBe("true");
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
  it("renders a non-interactive element when disabled or without handlers", () => {
    render(
      <ResultList aria-label="r">
        <ResultCard title="Disabled" disabled onSelect={() => {}} />
        <ResultCard title="Disabled link" disabled href="/x" />
        <ResultCard title="Static" />
      </ResultList>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Disabled link").closest("[aria-disabled]")).not.toBeNull();
  });
  it("lets a router render the link and doesn't print a bare 0", () => {
    render(
      <ResultList aria-label="r">
        <ResultCard
          title="Drill"
          meta={0}
          href="/p/1"
          renderLink={(props) => <a data-router="1" href="/p/1" {...props} />}
        />
      </ResultList>,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("data-router")).toBe("1");
    expect(link.textContent).toBe("Drill0");
  });
  it("omits absent slots", () => {
    render(
      <ResultList aria-label="r">
        <ResultCard title="Drill" onSelect={() => {}} />
      </ResultList>,
    );
    expect(screen.getByRole("button").textContent).toBe("Drill");
  });
});
