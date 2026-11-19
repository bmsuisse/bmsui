import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// vitest doesn't enable `globals`, so Testing Library's automatic afterEach
// cleanup (which only registers itself when it finds a global `afterEach`)
// never fires; without this every test after the first re-renders on top of
// the previous test's DOM instead of a clean one.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement these, but the Base UI primitives (Popover/Select/Menu/
// Checkbox) call them during open/close and keyboard-navigation handling. Without
// these no-op polyfills, interaction tests throw on "not a function".
if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

if (typeof Element.prototype.hasPointerCapture !== "function") {
  Element.prototype.hasPointerCapture = () => false;
}

if (typeof Element.prototype.releasePointerCapture !== "function") {
  Element.prototype.releasePointerCapture = () => {};
}

if (typeof Element.prototype.setPointerCapture !== "function") {
  Element.prototype.setPointerCapture = () => {};
}

// jsdom has no PointerEvent; Base UI's Checkbox constructs one when it is clicked.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? "";
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

// Newer Node versions ship their own global `localStorage` that is undefined
// unless Node runs with --localstorage-file, and it shadows jsdom's. Install a
// small in-memory Storage so persistence code (ColumnSelector persistKey) is testable.
function hasWorkingStorage(): boolean {
  try {
    return typeof window.localStorage?.getItem === "function";
  } catch {
    return false;
  }
}
if (!hasWorkingStorage()) {
  const data = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memoryStorage });
}
