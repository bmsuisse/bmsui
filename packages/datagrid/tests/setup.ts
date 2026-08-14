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

// jsdom doesn't implement these, but Radix primitives (Popover/Select/DropdownMenu/
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
