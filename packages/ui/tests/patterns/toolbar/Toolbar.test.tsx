import { BoldIcon, ItalicIcon } from "@heroicons/react/24/outline";
import { fireEvent, render, screen } from "@testing-library/react";
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
