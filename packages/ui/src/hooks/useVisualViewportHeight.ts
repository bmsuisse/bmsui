import { useEffect, useState } from "react";

export interface VisualViewportRect {
  height: number;
  /** Distance from the top of the layout viewport; non-zero while Safari pans the page for the keyboard. */
  offsetTop: number;
}

function read(): VisualViewportRect | null {
  if (typeof window === "undefined" || !window.visualViewport) return null;
  return { height: window.visualViewport.height, offsetTop: window.visualViewport.offsetTop };
}

/** The visual viewport's height and offset (it shrinks and pans while the on-screen keyboard is up), or `null` where unsupported. */
export function useVisualViewport(): VisualViewportRect | null {
  const [rect, setRect] = useState<VisualViewportRect | null>(read);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const update = (): void => {
      const next = read();
      setRect((prev) => (prev && next && prev.height === next.height && prev.offsetTop === next.offsetTop ? prev : next));
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return rect;
}

/** The visual viewport's height (it shrinks while the on-screen keyboard is up), or `null` where unsupported. */
export function useVisualViewportHeight(): number | null {
  return useVisualViewport()?.height ?? null;
}
