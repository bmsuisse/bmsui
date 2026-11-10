import { fireEvent, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatHotkey, type Hotkey, useHotkeys, type UseHotkeysOptions } from "../../src/hooks/useHotkeys";

function setPlatform(platform: string) {
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(platform === "MacIntel" ? "Mac OS X" : "Windows NT 10.0");
}

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function setup(hotkeys: Hotkey[], options?: UseHotkeysOptions) {
  return renderHook(({ h, o }) => useHotkeys(h, o), { initialProps: { h: hotkeys, o: options } });
}

describe("useHotkeys", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("maps mod to Ctrl off Apple platforms and prevents default", () => {
    setPlatform("Win32");
    const handler = vi.fn();
    setup([{ keys: "mod+k", handler }]);
    expect(press("k", { metaKey: true }).defaultPrevented).toBe(false);
    expect(handler).not.toHaveBeenCalled();
    const event = press("k", { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("maps mod to Meta on Apple platforms", () => {
    setPlatform("MacIntel");
    const handler = vi.fn();
    setup([{ keys: "mod+k", handler }]);
    press("k", { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
    press("k", { metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("requires exact modifiers: plain k does not fire mod+k and vice versa", () => {
    setPlatform("Win32");
    const plain = vi.fn();
    const mod = vi.fn();
    setup([
      { keys: "mod+k", handler: mod },
      { keys: "k", handler: plain },
    ]);
    press("k");
    expect(plain).toHaveBeenCalledTimes(1);
    expect(mod).not.toHaveBeenCalled();
    press("K", { shiftKey: true });
    expect(plain).toHaveBeenCalledTimes(1);
  });

  it("matches shift+? and bare ? regardless of layout shift", () => {
    const sheet = vi.fn();
    const first = setup([{ keys: "shift+?", handler: sheet }]);
    press("?", { shiftKey: true });
    expect(sheet).toHaveBeenCalledTimes(1);
    press("?");
    expect(sheet).toHaveBeenCalledTimes(1);
    first.unmount();

    const bare = vi.fn();
    setup([{ keys: "?", handler: bare }]);
    press("?", { shiftKey: true });
    expect(bare).toHaveBeenCalledTimes(1);
  });

  it("falls back to event.code for alt-modified letters", () => {
    const handler = vi.fn();
    setup([{ keys: "alt+k", handler }]);
    press("˚", { altKey: true, code: "KeyK" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores typing targets unless allowed", () => {
    const handler = vi.fn();
    const escape = vi.fn();
    setup([
      { keys: "n", handler },
      { keys: "escape", handler: escape, allowInInputs: true },
    ]);
    const { container } = render(
      <div>
        <input data-testid="i" />
        <textarea />
        <div contentEditable suppressContentEditableWarning>
          <span>x</span>
        </div>
      </div>,
    );
    for (const el of [
      container.querySelector("input")!,
      container.querySelector("textarea")!,
      container.querySelector("span")!,
    ]) {
      press("n", {}, el);
    }
    expect(handler).not.toHaveBeenCalled();
    press("Escape", {}, container.querySelector("input")!);
    expect(escape).toHaveBeenCalledTimes(1);
  });

  it("honours per-hotkey and hook-level enabled and preventDefault", () => {
    const a = vi.fn();
    const b = vi.fn();
    const { rerender } = setup([
      { keys: "a", handler: a, enabled: false },
      { keys: "b", handler: b, preventDefault: false },
    ]);
    press("a");
    expect(a).not.toHaveBeenCalled();
    expect(press("b").defaultPrevented).toBe(false);
    expect(b).toHaveBeenCalledTimes(1);

    rerender({ h: [{ keys: "b", handler: b }], o: { enabled: false } });
    press("b");
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("fires chords pressed within the timeout", () => {
    vi.useFakeTimers();
    const inbox = vi.fn();
    setup([{ keys: "g i", handler: inbox }], { chordTimeoutMs: 500 });
    press("g");
    press("i");
    expect(inbox).toHaveBeenCalledTimes(1);

    press("g");
    vi.advanceTimersByTime(600);
    press("i");
    expect(inbox).toHaveBeenCalledTimes(1);

    press("i");
    expect(inbox).toHaveBeenCalledTimes(1);
  });

  it("uses the latest handler without re-subscribing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const add = vi.spyOn(window, "addEventListener");
    const { rerender } = setup([{ keys: "x", handler: first }]);
    rerender({ h: [{ keys: "x", handler: second }], o: undefined });
    press("x");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(add.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
  });

  it("skips IME composition and already-handled events", () => {
    const handler = vi.fn();
    setup([{ keys: "a", handler }]);
    press("a", { isComposing: true });
    const handled = new KeyboardEvent("keydown", { key: "a", cancelable: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    expect(handler).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "a" });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("formatHotkey", () => {
  it("formats for mac and other platforms", () => {
    expect(formatHotkey("mod+k", "mac")).toBe("⌘K");
    expect(formatHotkey("mod+k", "other")).toBe("Ctrl+K");
    expect(formatHotkey("mod+shift+p", "mac")).toBe("⇧⌘P");
    expect(formatHotkey("mod+shift+p", "other")).toBe("Ctrl+Shift+P");
    expect(formatHotkey("alt+enter", "other")).toBe("Alt+Enter");
    expect(formatHotkey("escape", "mac")).toBe("Esc");
    expect(formatHotkey("g i", "other")).toBe("G I");
    expect(formatHotkey("shift+?", "other")).toBe("Shift+?");
  });

  it("detects the platform when not given", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    expect(formatHotkey("mod+k")).toBe("⌘K");
    vi.restoreAllMocks();
  });
});
