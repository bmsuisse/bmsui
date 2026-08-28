import type { RefObject } from "react";
import { useLayoutEffect, useRef, useState } from "react";

export interface StickyGroupHeaderTop {
  /** Attach to the grid's own `<thead>`. */
  theadRef: RefObject<HTMLTableSectionElement>;
  /** The measured `<thead>` height in pixels — `0` until first measured, or whenever `enabled` is false. */
  groupHeaderTop: number;
}

/**
 * Measures the real header height so a sticky group-header row can sit
 * exactly below it (its own `top` style) while member rows scroll past
 * underneath. `ResizeObserver` rather than a one-off measurement since
 * header height can change after mount (e.g. a column's header content
 * wrapping to a second line, or a resizable column changing the header
 * row's layout). Shared between `<DataGrid>` and `<TreeDataGrid>`'s own
 * `groupBy` support.
 */
export function useStickyGroupHeaderTop(enabled: boolean): StickyGroupHeaderTop {
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [groupHeaderTop, setGroupHeaderTop] = useState(0);
  useLayoutEffect(() => {
    if (!enabled) return;
    const theadEl = theadRef.current;
    if (!theadEl) return;
    const updateHeight = (): void => setGroupHeaderTop(theadEl.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(theadEl);
    return () => observer.disconnect();
  }, [enabled]);
  return { theadRef, groupHeaderTop };
}
