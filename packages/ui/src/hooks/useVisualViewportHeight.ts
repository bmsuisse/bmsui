import { useEffect, useState } from "react";

/** The visual viewport's height (it shrinks while the on-screen keyboard is up), or `null` where unsupported. */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() =>
    typeof window === "undefined" ? null : (window.visualViewport?.height ?? null),
  );

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const update = (): void => setHeight(viewport.height);
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}
