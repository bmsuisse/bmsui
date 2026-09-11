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

// jsdom doesn't implement these, but Radix primitives (Popover/Select/Dialog)
// call them during open/close and keyboard-navigation handling. Without
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

// jsdom has no PointerEvent constructor at all, so fireEvent.pointerDown/Move
// dispatch a plain Event with no clientX/clientY — any test asserting drag
// deltas needs those fields, which MouseEvent already implements.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

// jsdom doesn't implement matchMedia; useMediaQuery (and anything built on
// it, like ResponsivePanel) needs it to determine desktop vs. mobile layout.
// Defaults to "no match" so tests get the mobile/drawer branch unless a test
// overrides `window.matchMedia` itself to assert the desktop branch.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
