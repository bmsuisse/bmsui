import { useEffect, useState } from "react";

/**
 * Height of the visible viewport in CSS px, shrinking while a mobile on-screen
 * keyboard is up (`window.visualViewport`), so a full-screen overlay can keep
 * its scroll area — and its input — above the keyboard instead of behind it.
 * `null` where the API is unavailable (SSR, old browsers): fall back to `dvh`.
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() =>
    typeof window !== "undefined" && window.visualViewport ? window.visualViewport.height : null,
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = (): void => setHeight(vv.height);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}
