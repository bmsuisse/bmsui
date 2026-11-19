import type { RefObject } from "react";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Measures where an element's bottom edge sits inside its table
 * (its bottom edge relative to the table top), so a sticky row can pin itself exactly below
 * it. Used by `<TreeDataGrid>` to stack the second header row and a top
 * totals row under the rows above them. `ResizeObserver` because header height
 * can change after mount (wrapping labels, a resized column). `0` until
 * measured or when `enabled` is false.
 */
export function useBottomOffset<T extends HTMLElement>(enabled: boolean): { ref: RefObject<T | null>; bottom: number } {
  const ref = useRef<T>(null);
  const [bottom, setBottom] = useState(0);
  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    // Fractional on purpose (`offsetTop`/`offsetHeight` round): a header row is often
    // 24.5px tall, and a whole-pixel offset leaves a sliver where the rows show through.
    const update = (): void => {
      const table = el.closest("table");
      setBottom(table ? el.getBoundingClientRect().bottom - table.getBoundingClientRect().top : el.offsetTop + el.offsetHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);
  return { ref, bottom: enabled ? bottom : 0 };
}
