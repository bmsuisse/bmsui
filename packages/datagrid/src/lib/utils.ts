import type { SyntheticEvent } from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges conditional class names, then dedupes conflicting Tailwind utility classes. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Every interactive control rendered *inside* a row (the expand chevron, the
 * selection checkbox, `rowActions`' kebab trigger) must stop a click from
 * bubbling up to the `<tr>` — otherwise a `getRowProps`-driven row-wide
 * `onClick` (e.g. "click the row to navigate") fires alongside whatever the
 * control itself was meant to do, since the control's own click event
 * bubbles to the row by default. Use this on every such control's `onClick`
 * rather than inlining `(event) => event.stopPropagation()` at each call
 * site — a repeated one-liner is easy to miss adding to the *next* per-row
 * control (see ActionsMenu's kebab trigger, which was missed here once
 * already).
 */
export function stopRowClick(event: SyntheticEvent): void {
  event.stopPropagation();
}
