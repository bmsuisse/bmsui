import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CommandPalette,
  CommandPaletteTrigger,
  useCommandPaletteHotkey,
  useRecentCommands,
} from "../../../src/patterns/command-palette/CommandPalette";
import { scoreCommand } from "../../../src/patterns/command-palette/commandFilter";
import { CommandRegistryProvider, useRegisterCommands } from "../../../src/patterns/command-palette/registry";
import type { CommandItem } from "../../../src/patterns/command-palette/types";

function makeCommands(spies: Record<string, () => void> = {}): CommandItem[] {
  return [
    { id: "new-offer", group: "Create", label: "New offer", keywords: ["angebot"], shortcut: ["⌘", "N"], onSelect: spies["new-offer"] ?? (() => {}) },
    { id: "new-contact", group: "Create", label: "New contact", onSelect: spies["new-contact"] ?? (() => {}) },
    { id: "customers", group: "Go to", label: "Customers", onSelect: spies.customers ?? (() => {}) },
    { id: "delete", group: "Go to", label: "Delete all", disabled: "Not allowed", onSelect: spies.delete ?? (() => {}) },
  ];
}

function Harness(props: Partial<React.ComponentProps<typeof CommandPalette>> & { commands?: CommandItem[] }): ReactNode {
  const [open, setOpen] = useState(true);
  return <CommandPalette open={open} onOpenChange={setOpen} commands={props.commands ?? makeCommands()} {...props} />;
}

const input = (): HTMLElement => screen.getByTestId("command-palette-input");
const items = (): HTMLElement[] => screen.getAllByTestId("command-palette-item");

describe("scoreCommand", () => {
  it("ranks prefix > word start > substring > keywords > subsequence", () => {
    const prefix = scoreCommand("new", "New offer");
    const word = scoreCommand("off", "New offer");
    const sub = scoreCommand("ffer", "New offer");
    const kw = scoreCommand("angebot", "New offer", ["angebot"]);
    const seq = scoreCommand("nwof", "New offer");
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(sub);
    expect(sub).toBeGreaterThan(kw);
    expect(kw).toBeGreaterThan(seq);
    expect(seq).toBeGreaterThan(0);
    expect(scoreCommand("xyz", "New offer")).toBe(0);
    expect(scoreCommand("uber", "Über uns")).toBeGreaterThan(0);
  });
});

describe("CommandPalette", () => {
  afterEach(() => window.localStorage.clear());

  it("lists commands in groups with shortcut hints, combobox wired to the listbox", () => {
    render(<Harness />);
    expect(input()).toHaveAttribute("role", "combobox");
    expect(input()).toHaveFocus();
    const listbox = screen.getByRole("listbox");
    expect(input()).toHaveAttribute("aria-controls", listbox.id);
    expect(screen.getAllByRole("group")).toHaveLength(2);
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(items()).toHaveLength(4);
    expect(input()).toHaveAttribute("aria-activedescendant", items()[0]!.id);
    expect(items()[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("N").tagName).toBe("KBD");
  });

  it("filters by label and keywords, and shows the empty state", () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: "angebot" } });
    expect(items().map((i) => i.dataset.command)).toEqual(["new-offer"]);
    fireEvent.change(input(), { target: { value: "zzz" } });
    expect(screen.queryAllByTestId("command-palette-item")).toHaveLength(0);
    expect(screen.getByText("No matching commands")).toBeInTheDocument();
  });

  it("arrow keys move (wrapping), Enter runs and closes, onCommandRun fires", () => {
    const spy = vi.fn();
    const onCommandRun = vi.fn();
    render(<Harness commands={makeCommands({ "new-contact": spy })} onCommandRun={onCommandRun} />);
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    expect(items()[3]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(input()).toHaveAttribute("aria-activedescendant", items()[1]!.id);
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(spy).toHaveBeenCalledOnce();
    expect(onCommandRun).toHaveBeenCalledWith(expect.objectContaining({ id: "new-contact" }));
    expect(screen.queryByTestId("command-palette")).toBeNull();
  });

  it("does not run disabled commands and shows their reason", () => {
    const spy = vi.fn();
    render(<Harness commands={makeCommands({ delete: spy })} />);
    expect(screen.getByText("Not allowed")).toBeInTheDocument();
    const del = items().find((i) => i.dataset.command === "delete")!;
    expect(del).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(del);
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
  });

  it("click runs a command", () => {
    const spy = vi.fn();
    render(<Harness commands={makeCommands({ customers: spy })} />);
    fireEvent.click(screen.getByText("Customers"));
    expect(spy).toHaveBeenCalledOnce();
  });

  it("lists recent commands first while the query is empty", () => {
    render(<Harness recent={["customers"]} labels={{ recent: "Zuletzt" }} />);
    expect(screen.getByText("Zuletzt")).toBeInTheDocument();
    expect(items()[0]).toHaveAttribute("data-command", "customers");
    expect(items().filter((i) => i.dataset.command === "customers")).toHaveLength(1);
    fireEvent.change(input(), { target: { value: "cust" } });
    expect(screen.queryByText("Zuletzt")).toBeNull();
  });

  it("includes commands registered by mounted components", () => {
    function PageCommands(): null {
      const commands = useMemo<CommandItem[]>(() => [{ id: "page", group: "Page", label: "Export page", onSelect: () => {} }], []);
      useRegisterCommands(commands);
      return null;
    }
    function App({ withPage }: { withPage: boolean }): ReactNode {
      return (
        <CommandRegistryProvider>
          {withPage ? <PageCommands /> : null}
          <Harness />
        </CommandRegistryProvider>
      );
    }
    const { rerender } = render(<App withPage />);
    expect(screen.getByText("Export page")).toBeInTheDocument();
    rerender(<App withPage={false} />);
    expect(screen.queryByText("Export page")).toBeNull();
  });
});

describe("useCommandPaletteHotkey", () => {
  it("fires on Ctrl+K and Meta+K only", () => {
    const handler = vi.fn();
    renderHook(() => useCommandPaletteHotkey(handler));
    fireEvent.keyDown(window, { key: "k" });
    expect(handler).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.keyDown(window, { key: "K", metaKey: true });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("can be disabled", () => {
    const handler = vi.fn();
    renderHook(() => useCommandPaletteHotkey(handler, { enabled: false }));
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("useRecentCommands", () => {
  afterEach(() => window.localStorage.clear());

  it("keeps most-recent-first unique ids and persists them", () => {
    const { result } = renderHook(() => useRecentCommands("t", 2));
    act(() => result.current.push("a"));
    act(() => result.current.push("b"));
    act(() => result.current.push("a"));
    act(() => result.current.push("c"));
    expect(result.current.recent).toEqual(["c", "a"]);
    const again = renderHook(() => useRecentCommands("t", 2));
    expect(again.result.current.recent).toEqual(["c", "a"]);
  });

  it("survives blocked storage", () => {
    const spy = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useRecentCommands("x"));
    act(() => result.current.push("a"));
    expect(result.current.recent).toEqual(["a"]);
    spy.mockRestore();
    set.mockRestore();
  });
});

describe("CommandPaletteTrigger", () => {
  it("renders a labelled button with a shortcut hint", () => {
    const onClick = vi.fn();
    render(<CommandPaletteTrigger onClick={onClick} shortcut="Ctrl K" />);
    fireEvent.click(screen.getByRole("button", { name: "Search…" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText("Ctrl K")).toBeInTheDocument();
  });
});

describe("review regressions", () => {
  it("useRegisterCommands with an inline array doesn't loop and keeps handlers fresh", () => {
    let renders = 0;
    const seen: number[] = [];
    function PageCommands({ n }: { n: number }): null {
      renders += 1;
      useRegisterCommands([{ id: "page", group: "Page", label: "Export page", onSelect: () => seen.push(n) }]);
      return null;
    }
    function Palette(): ReactNode {
      const [open, setOpen] = useState(true);
      return <CommandPalette open={open} onOpenChange={setOpen} commands={[]} />;
    }
    function App({ n }: { n: number }): ReactNode {
      return (
        <CommandRegistryProvider>
          <PageCommands n={n} />
          <Palette />
        </CommandRegistryProvider>
      );
    }
    const { rerender } = render(<App n={1} />);
    expect(renders).toBeLessThan(5);
    rerender(<App n={2} />);
    expect(renders).toBeLessThan(6);
    fireEvent.click(screen.getByText("Export page"));
    expect(seen).toEqual([2]);
  });

  it("group headers get valid ids even when the group name has spaces", () => {
    render(<Harness />);
    const group = screen.getAllByRole("group").find((g) => g.textContent?.includes("Customers"))!;
    const id = group.getAttribute("aria-labelledby")!;
    expect(id).not.toMatch(/\s/);
    expect(document.getElementById(id)).toHaveTextContent("Go to");
  });

  it("useCommandPaletteHotkey ignores keydown events without a key (autofill)", () => {
    const handler = vi.fn();
    renderHook(() => useCommandPaletteHotkey(handler));
    const event = new KeyboardEvent("keydown", { ctrlKey: true });
    Object.defineProperty(event, "key", { value: undefined });
    expect(() => window.dispatchEvent(event)).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it("useRecentCommands renders defaults first (SSR-safe), then reads storage", async () => {
    window.localStorage.setItem("bmsui:recent-commands:ssr", JSON.stringify(["a"]));
    const { renderToString } = await import("react-dom/server");
    function Probe(): ReactNode {
      return <span>{useRecentCommands("ssr").recent.join(",") || "none"}</span>;
    }
    expect(renderToString(<Probe />)).toContain("none");
    render(<Probe />);
    expect(screen.getByText("a")).toBeInTheDocument();
    window.localStorage.clear();
  });
});
