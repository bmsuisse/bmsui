import type { ColumnVisibility } from "./types";

export function storageKeyFor(persistKey: string): string {
  return `bmsui-datagrid:columns:${persistKey}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads and JSON-parses a persisted `ColumnVisibility` from localStorage.
 * Returns `null` if there's nothing stored, the JSON is malformed, or the
 * parsed value isn't a plain object — callers should fall back to whatever
 * visibility they already have rather than throwing on stale/corrupt data
 * (e.g. a previous version of this component persisting a different shape).
 */
export function readPersistedVisibility(persistKey: string): ColumnVisibility | null {
  const raw = window.localStorage.getItem(storageKeyFor(persistKey));
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? (parsed as ColumnVisibility) : null;
  } catch {
    return null;
  }
}

export function writePersistedVisibility(persistKey: string, visibility: ColumnVisibility): void {
  window.localStorage.setItem(storageKeyFor(persistKey), JSON.stringify(visibility));
}

// A separate key (not a nested field under storageKeyFor's own key) so an
// app already persisting visibility under `persistKey` before this existed
// keeps reading that same flat `ColumnVisibility` shape unchanged -- adding
// order under a distinct suffix needs no migration and can't corrupt/shadow
// existing stored visibility data.
export function orderStorageKeyFor(persistKey: string): string {
  return `bmsui-datagrid:columns:${persistKey}:order`;
}

/**
 * Reads and JSON-parses a persisted column order (array of column ids) from
 * localStorage. Returns `null` if there's nothing stored, the JSON is
 * malformed, or the parsed value isn't an array of strings -- same
 * fall-back-don't-throw contract as `readPersistedVisibility`.
 */
export function readPersistedColumnOrder(persistKey: string): string[] | null {
  const raw = window.localStorage.getItem(orderStorageKeyFor(persistKey));
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string") ? parsed : null;
  } catch {
    return null;
  }
}

export function writePersistedColumnOrder(persistKey: string, order: readonly string[]): void {
  window.localStorage.setItem(orderStorageKeyFor(persistKey), JSON.stringify(order));
}
