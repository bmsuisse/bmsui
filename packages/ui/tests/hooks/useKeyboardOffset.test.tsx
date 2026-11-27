import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardOffset } from "../../src/hooks/useKeyboardOffset";

function mockViewport(viewport: { height: number; offsetTop: number; scale: number }): void {
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: { ...viewport, addEventListener: () => {}, removeEventListener: () => {} },
  });
}

afterEach(() => {
  Reflect.deleteProperty(window, "visualViewport");
  vi.restoreAllMocks();
});

describe("useKeyboardOffset", () => {
  it("is the gap under the visible area while a keyboard is up", () => {
    mockViewport({ height: 450, offsetTop: 0, scale: 1 });
    expect(renderHook(() => useKeyboardOffset()).result.current).toBe(350);
  });

  it("follows Safari panning the visual viewport", () => {
    mockViewport({ height: 400, offsetTop: 100, scale: 1 });
    expect(renderHook(() => useKeyboardOffset()).result.current).toBe(300);
  });

  it("is 0 for URL-bar sized differences", () => {
    mockViewport({ height: 760, offsetTop: 0, scale: 1 });
    expect(renderHook(() => useKeyboardOffset()).result.current).toBe(0);
  });

  it("does not mistake pinch-zoom for a keyboard", () => {
    mockViewport({ height: 400, offsetTop: 0, scale: 2 });
    expect(renderHook(() => useKeyboardOffset()).result.current).toBe(0);
  });
});
