import type { CSSProperties, RefCallback } from "react";
import { useScrollOverflow } from "../hooks/useScrollOverflow";

/** Classes for the wrapper around a scroll region: the focus ring lives here so the fade mask does not dim it. */
export const SCROLL_FOCUS_WRAPPER = "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ring";
/** Classes for the scroll region itself. */
export const SCROLL_REGION = "focus-visible:outline-none";

const FADE = "1.5rem";

/**
 * Internal: an edge fade (`mask-image`) on the sides of a scroll region that have more content,
 * so overlay scrollbars and height caps still show that there is more to read.
 */
export function useScrollFade<T extends HTMLElement>(): { ref: RefCallback<T>; style: CSSProperties } {
  const { ref, top, bottom, left, right } = useScrollOverflow<T>();
  const vertical = top || bottom;
  const horizontal = left || right;
  if (!vertical && !horizontal) return { ref, style: {} };
  const layers: string[] = [];
  if (vertical) {
    layers.push(
      `linear-gradient(to bottom, ${top ? `transparent, black ${FADE}` : "black"}, ${bottom ? `black calc(100% - ${FADE}), transparent` : "black"})`,
    );
  }
  if (horizontal) {
    layers.push(
      `linear-gradient(to right, ${left ? `transparent, black ${FADE}` : "black"}, ${right ? `black calc(100% - ${FADE}), transparent` : "black"})`,
    );
  }
  const mask = layers.join(", ");
  return {
    ref,
    style: { maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in" } as CSSProperties,
  };
}
