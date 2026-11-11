import { BoldIcon, ItalicIcon } from "@heroicons/react/24/outline";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "../../../src/patterns/toolbar/Toolbar";

afterEach(() => vi.restoreAllMocks());

describe("Toolbar", () => {
  it("is a single tab stop with arrow/Home/End roving focus, skipping disabled items", () => {
    render(
      <Toolbar aria-label="Format">
        <ToolbarButton label="Bold" icon={BoldIcon} />
        <ToolbarButton label="Italic" icon={ItalicIcon} disabled />
        <ToolbarSeparator />
        <ToolbarButton label="Link" />
        <ToolbarButton label="Quote" />
      </Toolbar>,
    );
    const toolbar = screen.getByRole("toolbar", { name: "Format" });
    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
    const bold = screen.getByRole("button", { name: "Bold" });
    const link = screen.getByRole("button", { name: "Link" });
    const quote = screen.getByRole("button", { name: "Quote" });
    expect(bold).toHaveAttribute("tabindex", "0");
    expect(link).toHaveAttribute("tabindex", "-1");

    bold.focus();
    fireEvent.keyDown(bold, { key: "ArrowRight" });
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("tabindex", "0");
    expect(bold).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(link, { key: "End" });
    expect(quote).toHaveFocus();
    fireEvent.keyDown(quote, { key: "ArrowRight" });
    expect(bold).toHaveFocus();
    fireEvent.keyDown(bold, { key: "ArrowLeft" });
    expect(quote).toHaveFocus();
    fireEvent.keyDown(quote, { key: "Home" });
    expect(bold).toHaveFocus();
  });

  it("Tab leaves the toolbar after one stop", async () => {
    render(
      <>
        <Toolbar aria-label="T">
          <ToolbarButton label="A" />
          <ToolbarButton label="B" />
        </Toolbar>
        <button type="button">after</button>
      </>,
    );
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "A" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "A" })).toHaveFocus();
  });

  it("vertical orientation uses up/down and a horizontal separator", () => {
    render(
      <Toolbar aria-label="V" orientation="vertical">
        <ToolbarButton label="A" />
        <ToolbarSeparator />
        <ToolbarButton label="B" />
      </Toolbar>,
    );
    const a = screen.getByRole("button", { name: "A" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "B" })).toHaveFocus();
    expect(screen.getByTestId("toolbar-separator")).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("ToolbarButton: icon-only gets aria-label, pressed sets aria-pressed, click fires", () => {
    const onClick = vi.fn();
    render(
      <Toolbar aria-label="T">
        <ToolbarButton label="Bold" icon={BoldIcon} pressed onClick={onClick} />
        <ToolbarButton label="Text" icon={ItalicIcon} showLabel />
      </Toolbar>,
    );
    const bold = screen.getByRole("button", { name: "Bold" });
    expect(bold).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(bold);
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Text" })).toHaveTextContent("Text");
  });

  it("overflow moves buttons that don't fit into a … menu", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(80);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("role") === "toolbar" ? 250 : 0;
    });
    const onDelete = vi.fn();
    render(
      <Toolbar aria-label="Actions" overflow labels={{ more: "Mehr" }}>
        <ToolbarButton label="Copy" showLabel />
        <ToolbarButton label="Print" showLabel />
        <ToolbarButton label="Share" showLabel />
        <ToolbarButton label="Delete" showLabel onClick={onDelete} />
      </Toolbar>,
    );
    // 250px fits two 80px slots plus the 32px "…" button.
    const hidden = screen.getByRole("toolbar").querySelectorAll("[data-toolbar-hidden]");
    expect(hidden).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Mehr" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});

describe("Toolbar overflow regressions", () => {
  const mockLayout = (state: { toolbar: number; perChar: number }): void => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return (this.textContent?.length ?? 0) * state.perChar;
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("role") === "toolbar" ? state.toolbar : 0;
    });
  };

  it("never hides non-ToolbarButton children; only ToolbarButtons go into the menu", () => {
    mockLayout({ toolbar: 200, perChar: 10 });
    render(
      <Toolbar aria-label="Actions" overflow>
        <select aria-label="View" data-toolbar-item="">
          <option>Grid</option>
        </select>
        <ToolbarButton label="Copyyyy" showLabel />
        <ToolbarButton label="Printtt" showLabel />
        <span>
          <button type="button">Wrapped</button>
        </span>
        <ToolbarButton label="Shareee" showLabel />
      </Toolbar>,
    );
    const toolbar = screen.getByRole("toolbar");
    const hidden = Array.from(toolbar.querySelectorAll("[data-toolbar-hidden]"));
    expect(hidden.length).toBeGreaterThan(0);
    for (const slot of hidden) expect(slot.querySelector("button[data-toolbar-item]")).not.toBeNull();
    expect(screen.getByRole("combobox", { name: "View" }).closest("[data-toolbar-hidden]")).toBeNull();
    expect(screen.getByRole("button", { name: "Wrapped" }).closest("[data-toolbar-hidden]")).toBeNull();
    expect(screen.getByTestId("toolbar-more")).toBeInTheDocument();
  });

  it("re-measures when a button's label changes", () => {
    mockLayout({ toolbar: 250, perChar: 10 });
    const { rerender } = render(
      <Toolbar aria-label="Actions" overflow>
        <ToolbarButton label="Copy" showLabel />
        <ToolbarButton label="Print" showLabel />
      </Toolbar>,
    );
    expect(screen.queryByTestId("toolbar-more")).toBeNull();
    rerender(
      <Toolbar aria-label="Actions" overflow>
        <ToolbarButton label="Copy" showLabel />
        <ToolbarButton label="Print the whole document now" showLabel />
      </Toolbar>,
    );
    expect(screen.getByTestId("toolbar-more")).toBeInTheDocument();
    expect(screen.getByRole("toolbar").querySelectorAll("[data-toolbar-hidden]")).toHaveLength(1);
  });

  it("doesn't cache widths measured while the toolbar had no width", () => {
    const callbacks: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          callbacks.push(cb);
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
    const state = { toolbar: 0, perChar: 0 };
    mockLayout(state);
    render(
      <Toolbar aria-label="Actions" overflow>
        <ToolbarButton label="Copy" showLabel />
        <ToolbarButton label="Print" showLabel />
        <ToolbarButton label="Share" showLabel />
      </Toolbar>,
    );
    expect(screen.queryByTestId("toolbar-more")).toBeNull();
    state.toolbar = 100;
    state.perChar = 10;
    act(() => {
      for (const cb of callbacks) cb();
    });
    expect(screen.getByTestId("toolbar-more")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
