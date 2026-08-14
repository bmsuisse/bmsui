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
