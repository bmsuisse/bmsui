import { vi } from "vitest";

/** Makes every `matchMedia` query answer as a desktop (`min-width` queries match) or a phone viewport. */
export function mockViewport(kind: "desktop" | "phone"): void {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: kind === "desktop" ? /min-width/.test(query) : /max-width/.test(query),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}
