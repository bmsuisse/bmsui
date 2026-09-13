import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardOffset } from "../../src/lib/useKeyboardOffset";

type Listener = () => void;

function mockVisualViewport(initialHeight: number): { setHeight: (height: number) => void } {
  let height = initialHeight;
  const listeners: { resize: Listener[]; scroll: Listener[] } = { resize: [], scroll: [] };

  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: {
      get height() {
        return height;
      },
      addEventListener: (type: "resize" | "scroll", cb: Listener) => {
        listeners[type].push(cb);
      },
      removeEventListener: (type: "resize" | "scroll", cb: Listener) => {
        listeners[type] = listeners[type].filter((l) => l !== cb);
      },
    },
  });

  return {
    setHeight: (next: number) => {
      height = next;
      listeners.resize.forEach((cb) => cb());
    },
  };
}

describe("useKeyboardOffset", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error jsdom doesn't define visualViewport; clean up our stub.
    delete window.visualViewport;
  });

  it("returns 0 initially", () => {
    mockVisualViewport(800);
    const { result } = renderHook(() => useKeyboardOffset());
    expect(result.current).toBe(0);
  });

  it("returns 0 for a sub-threshold shrink", () => {
    const viewport = mockVisualViewport(800);
    const { result } = renderHook(() => useKeyboardOffset());
    act(() => viewport.setHeight(750));
    expect(result.current).toBe(0);
  });

  it("returns the delta for a shrink past the threshold", () => {
    const viewport = mockVisualViewport(800);
    const { result } = renderHook(() => useKeyboardOffset());
    act(() => viewport.setHeight(700));
    expect(result.current).toBe(100);
  });

  it("returns to 0 when the viewport grows back", () => {
    const viewport = mockVisualViewport(800);
    const { result } = renderHook(() => useKeyboardOffset());
    act(() => viewport.setHeight(700));
    expect(result.current).toBe(100);
    act(() => viewport.setHeight(800));
    expect(result.current).toBe(0);
  });

  it("respects a custom threshold option", () => {
    const viewport = mockVisualViewport(800);
    const { result } = renderHook(() => useKeyboardOffset({ threshold: 30 }));
    act(() => viewport.setHeight(770));
    expect(result.current).toBe(0);
    act(() => viewport.setHeight(760));
    expect(result.current).toBe(40);
  });
});
