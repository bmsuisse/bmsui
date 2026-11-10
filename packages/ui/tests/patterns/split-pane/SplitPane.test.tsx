import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SplitPane, SplitPanePanel } from "../../../src/patterns/split-pane/SplitPane";

// jsdom has no layout: give every element a 1000px box so px limits and drag deltas resolve.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(500);
});
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

const separators = (): HTMLElement[] => screen.getAllByRole("separator");
const flexOf = (i: number): string => (screen.getAllByTestId("split-pane-pane")[i] as HTMLElement).style.flex;

describe("SplitPane", () => {
  it("renders panes with a focusable separator carrying aria values", () => {
    render(
      <SplitPane defaultSizes={[30, 70]}>
        <div>A</div>
        <div>B</div>
      </SplitPane>,
    );
    const [sep] = separators();
    expect(sep).toHaveAttribute("tabindex", "0");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    expect(sep).toHaveAttribute("aria-valuenow", "30");
    expect(sep).toHaveAttribute("aria-controls", screen.getAllByTestId("split-pane-pane")[0]!.id);
    expect(flexOf(0)).toMatch(/^30 1 0px$/);
  });

  it("arrow keys resize (Shift = bigger), Home/End jump to limits", () => {
    const onSizesChange = vi.fn();
    render(
      <SplitPane defaultSizes={[50, 50]} onSizesChange={onSizesChange}>
        <SplitPanePanel minSize={20} maxSize="700px">A</SplitPanePanel>
        <div>B</div>
      </SplitPane>,
    );
    const sep = separators()[0]!;
    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(sep).toHaveAttribute("aria-valuenow", "52");
    fireEvent.keyDown(sep, { key: "ArrowLeft", shiftKey: true });
    expect(sep).toHaveAttribute("aria-valuenow", "42");
    fireEvent.keyDown(sep, { key: "Home" });
    expect(sep).toHaveAttribute("aria-valuenow", "20");
    fireEvent.keyDown(sep, { key: "End" });
    expect(sep).toHaveAttribute("aria-valuenow", "70");
    expect(onSizesChange).toHaveBeenLastCalledWith([70, 30]);
  });

  it("respects the neighbour's minimum", () => {
    render(
      <SplitPane defaultSizes={[50, 50]}>
        <div>A</div>
        <SplitPanePanel minSize="400px">B</SplitPanePanel>
      </SplitPane>,
    );
    const sep = separators()[0]!;
    fireEvent.keyDown(sep, { key: "End" });
    expect(sep).toHaveAttribute("aria-valuenow", "60");
  });

  it("drags with the pointer and commits on release", () => {
    const onSizesCommit = vi.fn();
    render(
      <SplitPane defaultSizes={[50, 50]} onSizesCommit={onSizesCommit}>
        <div>A</div>
        <div>B</div>
      </SplitPane>,
    );
    const sep = separators()[0]!;
    fireEvent.pointerDown(sep, { clientX: 500, button: 0, pointerId: 1 });
    expect(screen.getByTestId("split-pane")).toHaveAttribute("data-resizing");
    fireEvent.pointerMove(sep, { clientX: 600, pointerId: 1 });
    expect(sep).toHaveAttribute("aria-valuenow", "60");
    expect(onSizesCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(sep, { clientX: 600, pointerId: 1 });
    expect(onSizesCommit).toHaveBeenCalledWith([60, 40]);
    expect(screen.getByTestId("split-pane")).not.toHaveAttribute("data-resizing");
  });

  it("double-click resets to defaultSizes", () => {
    render(
      <SplitPane defaultSizes={[40, 60]}>
        <div>A</div>
        <div>B</div>
      </SplitPane>,
    );
    const sep = separators()[0]!;
    fireEvent.keyDown(sep, { key: "ArrowRight", shiftKey: true });
    expect(sep).toHaveAttribute("aria-valuenow", "50");
    fireEvent.doubleClick(sep);
    expect(sep).toHaveAttribute("aria-valuenow", "40");
  });

  it("persists sizes under storageKey and restores them", () => {
    const { unmount } = render(
      <SplitPane storageKey="t">
        <div>A</div>
        <div>B</div>
      </SplitPane>,
    );
    fireEvent.keyDown(separators()[0]!, { key: "ArrowRight", shiftKey: true });
    unmount();
    expect(JSON.parse(window.localStorage.getItem("bmsui:split-pane:t")!)).toEqual([60, 40]);
    render(
      <SplitPane storageKey="t">
        <div>A</div>
        <div>B</div>
      </SplitPane>,
    );
    expect(separators()[0]).toHaveAttribute("aria-valuenow", "60");
  });

  it("ignores broken storage", () => {
    window.localStorage.setItem("bmsui:split-pane:bad", "not json");
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <SplitPane storageKey="bad" defaultSizes={[25, 75]}>
        <div>A</div>
        <div>B</div>
      </SplitPane>,
    );
    const sep = separators()[0]!;
    expect(sep).toHaveAttribute("aria-valuenow", "25");
    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(sep).toHaveAttribute("aria-valuenow", "27");
  });

  it("supports three panes and vertical direction", () => {
    render(
      <SplitPane direction="vertical" labels={{ separator: (i) => `Grenze ${i + 1}` }}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </SplitPane>,
    );
    expect(separators()).toHaveLength(2);
    const second = screen.getByRole("separator", { name: "Grenze 2" });
    expect(second).toHaveAttribute("aria-orientation", "horizontal");
    fireEvent.keyDown(second, { key: "ArrowDown" });
    expect(second).toHaveAttribute("aria-valuenow", "35");
    // Only the two neighbours change.
    expect(separators()[0]).toHaveAttribute("aria-valuenow", "33");
  });
});

describe("SplitPane SSR", () => {
  it("server markup uses the defaults, the stored layout applies on the client", async () => {
    window.localStorage.setItem("bmsui:split-pane:ssr", JSON.stringify([70, 30]));
    const { renderToString } = await import("react-dom/server");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const html = renderToString(
      <SplitPane storageKey="ssr" defaultSizes={[40, 60]}>
        <div>A</div>
        <div>B</div>
      </SplitPane>,
    );
    errors.mockRestore();
    expect(html).toContain('aria-valuenow="40"');
    render(
      <SplitPane storageKey="ssr" defaultSizes={[40, 60]}>
        <div>A</div>
        <div>B</div>
      </SplitPane>,
    );
    expect(separators()[0]).toHaveAttribute("aria-valuenow", "70");
  });
});
