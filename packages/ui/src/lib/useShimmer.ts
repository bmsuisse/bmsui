import { type RefObject, useEffect, useRef } from "react";
import { animate, prefersReducedMotion } from "./motion";

/**
 * Internal: a soft light sweep across text while `active`. Sets `data-shimmer` on the element
 * (the gradient/clip classes key off it) and drives `background-position` with the Web Animations
 * API. Nothing happens without WAAPI or under reduced motion, so the text just stays plain.
 */
export function useShimmer<T extends HTMLElement>(active: boolean): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!active || !el || prefersReducedMotion()) return;
    const anim = animate(el, [{ backgroundPosition: "100% 0" }, { backgroundPosition: "-100% 0" }], {
      duration: 1800,
      iterations: Infinity,
      easing: "linear",
    });
    if (!anim) return;
    el.setAttribute("data-shimmer", "");
    return () => {
      anim.cancel();
      el.removeAttribute("data-shimmer");
    };
  }, [active]);
  return ref;
}

/** Classes that turn on once `useShimmer` has set `data-shimmer`. */
export const SHIMMER_CLASSES =
  "data-[shimmer]:bg-[linear-gradient(90deg,var(--color-muted-foreground)_35%,var(--color-foreground)_50%,var(--color-muted-foreground)_65%)] data-[shimmer]:bg-[length:250%_100%] data-[shimmer]:bg-clip-text data-[shimmer]:text-transparent";
