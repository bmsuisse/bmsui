import type { KeyboardEvent, MouseEvent } from "react";

/** Wash on the active row; comes after the zebra stripe and the caller's row class so it wins. */
export const ACTIVE_ROW_CLASS =
  "bg-primary/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

// A click that lands on (or inside) one of these is that control's, not the row's.
const INTERACTIVE = "button, a, input, select, textarea, label, [role=button], [role=checkbox], [role=radio], [tabindex]";

/**
 * Props that make a `<tr>` the active row (`activeRowId`/`onActiveRowChange`
 * on both grids): `aria-selected`/`data-active`, and — when the caller can
 * change it — `tabIndex=0` plus click and Enter/Space toggling. Only a click
 * outside every inner control counts, and only a key pressed on the row
 * itself, so a button, input or editable cell inside the row keeps its own
 * behaviour. A caller's own `getRowProps` `onClick`/`onKeyDown` still run first.
 */
export function activeRowProps(
  id: string,
  activeRowId: string | null | undefined,
  onActiveRowChange: ((id: string | null) => void) | undefined,
  rowProps: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (activeRowId === undefined && !onActiveRowChange) return {};
  const isActive = activeRowId === id;
  const props: Record<string, unknown> = { "aria-selected": isActive, "data-active": isActive || undefined };
  if (!onActiveRowChange) return props;
  const callerClick = rowProps?.onClick as ((event: MouseEvent<HTMLElement>) => void) | undefined;
  const callerKeyDown = rowProps?.onKeyDown as ((event: KeyboardEvent<HTMLElement>) => void) | undefined;
  return {
    ...props,
    tabIndex: 0,
    onClick: (event: MouseEvent<HTMLElement>) => {
      callerClick?.(event);
      if (event.defaultPrevented) return;
      const control = (event.target as Element).closest(INTERACTIVE);
      if (control && control !== event.currentTarget && event.currentTarget.contains(control)) return;
      onActiveRowChange(isActive ? null : id);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      callerKeyDown?.(event);
      if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      onActiveRowChange(isActive ? null : id);
    },
  };
}
