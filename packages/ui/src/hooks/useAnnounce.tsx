import { type CSSProperties, useEffect, useRef } from "react";

export type AnnouncePoliteness = "polite" | "assertive";

export interface AnnounceOptions {
  /** `"polite"` (default) waits for the screen reader to finish; `"assertive"` interrupts — errors only. */
  politeness?: AnnouncePoliteness;
}

interface Regions {
  polite: HTMLElement;
  assertive: HTMLElement;
}

const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
};

let bodyRegions: Regions | null = null;
/** Regions rendered by mounted `<Announcer />`s; the most recently mounted one wins. */
const mountedRegions: Regions[] = [];

function createRegion(politeness: AnnouncePoliteness): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-live", politeness);
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("role", politeness === "assertive" ? "alert" : "status");
  el.setAttribute("data-bmsui-announcer", politeness);
  Object.assign(el.style, VISUALLY_HIDDEN);
  document.body.appendChild(el);
  return el;
}

function getRegions(): Regions | null {
  if (typeof document === "undefined" || !document.body) return null;
  const mounted = mountedRegions[mountedRegions.length - 1];
  if (mounted) return mounted;
  if (!bodyRegions || !bodyRegions.polite.isConnected || !bodyRegions.assertive.isConnected) {
    bodyRegions?.polite.remove();
    bodyRegions?.assertive.remove();
    bodyRegions = { polite: createRegion("polite"), assertive: createRegion("assertive") };
  }
  return bodyRegions;
}

/**
 * Speaks `message` to screen readers through a shared, visually hidden live
 * region (created lazily on `document.body` on first use; a no-op during
 * SSR). Repeating the same text is announced again: every call replaces the
 * region's content with a fresh node. Works outside React (query callbacks,
 * stores).
 */
export function announce(message: string, options: AnnounceOptions = {}): void {
  const regions = getRegions();
  if (!regions) return;
  const region = regions[options.politeness ?? "polite"];
  const node = document.createElement("span");
  node.textContent = message;
  region.replaceChildren(node);
}

/**
 * Returns {@link announce}: `announce("3 results", { politeness: "polite" })`.
 * The function is stable across renders.
 *
 * @example
 * const announce = useAnnounce();
 * useEffect(() => announce(`${rows.length} results`), [rows.length]);
 */
export function useAnnounce(): (message: string, options?: AnnounceOptions) => void {
  return announce;
}

/**
 * Optional: renders the live regions inside your tree. While mounted,
 * `announce()` speaks through it instead of the body-level regions. Mount one
 * inside a modal dialog's content: Radix hides everything outside an open
 * modal (`aria-hidden`), which silences the body-level regions.
 */
export function Announcer() {
  const polite = useRef<HTMLDivElement>(null);
  const assertive = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!polite.current || !assertive.current) return;
    const regions: Regions = { polite: polite.current, assertive: assertive.current };
    mountedRegions.push(regions);
    return () => {
      const index = mountedRegions.indexOf(regions);
      if (index !== -1) mountedRegions.splice(index, 1);
    };
  }, []);

  return (
    <>
      <div
        ref={polite}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-bmsui-announcer="polite"
        style={VISUALLY_HIDDEN}
      />
      <div
        ref={assertive}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-bmsui-announcer="assertive"
        style={VISUALLY_HIDDEN}
      />
    </>
  );
}
