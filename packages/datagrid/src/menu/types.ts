import type { ComponentType } from "react";

/** The row/selection context a menu item's visible/disabled/onSelect handlers are evaluated against. */
export interface MenuItemContext<TRow> {
  row?: TRow;
  selectedRows?: TRow[];
}

/**
 * A single entry in a row-actions (per-row kebab menu) or header-actions
 * (toolbar) menu. `rowActions` items are evaluated with `ctx.row` set;
 * `headerActions` items are evaluated with `ctx.selectedRows` set (whatever
 * the grid's current selection is, possibly empty).
 */
export interface MenuItem<TRow> {
  id: string;
  label: string;
  icon?: ComponentType;
  danger?: boolean;
  /** Defaults to always visible when omitted. */
  visible?: (ctx: MenuItemContext<TRow>) => boolean;
  /** Defaults to always enabled when omitted. */
  disabled?: (ctx: MenuItemContext<TRow>) => boolean;
  onSelect: (ctx: MenuItemContext<TRow>) => void;
}
