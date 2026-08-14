import type { MenuItem, MenuItemContext } from "./types";

/** A `MenuItem` with its `visible`/`disabled` predicates already evaluated against a context. */
export interface ResolvedMenuItem<TRow> extends MenuItem<TRow> {
  isDisabled: boolean;
}

/**
 * Evaluates each item's `visible`/`disabled` predicates against `ctx` (both
 * default to "always" when omitted), dropping items that aren't visible and
 * annotating the rest with `isDisabled`. Pure and UI-free on purpose, so the
 * gating logic itself — as opposed to the DropdownMenu rendering built on
 * top of it — can be unit-tested directly.
 */
export function resolveMenuItems<TRow>(
  items: readonly MenuItem<TRow>[],
  ctx: MenuItemContext<TRow>,
): ResolvedMenuItem<TRow>[] {
  const resolved: ResolvedMenuItem<TRow>[] = [];
  for (const item of items) {
    const isVisible = item.visible ? item.visible(ctx) : true;
    if (!isVisible) continue;
    resolved.push({ ...item, isDisabled: item.disabled ? item.disabled(ctx) : false });
  }
  return resolved;
}
