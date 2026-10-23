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

// A different top-level namespace segment ("column-order", not "columns")
// -- not just a ":order" suffix appended to storageKeyFor's own key -- so the
// two key families can never collide for ANY persistKey value. A suffix-only
// scheme is only "usually" distinct: storageKeyFor("foo:order") and
// orderStorageKeyFor("foo") would both resolve to
// "bmsui-datagrid:columns:foo:order", silently clobbering each other's data
// the moment two ColumnSelector instances in the same app pick persistKeys
// that differ by exactly that literal suffix. Diverging at the namespace
// segment itself rules that out structurally, not by convention.
export function orderStorageKeyFor(persistKey: string): string {
  return `bmsui-datagrid:column-order:${persistKey}`;
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

export function clearPersistedVisibility(persistKey: string): void {
  try {
    window.localStorage.removeItem(storageKeyFor(persistKey));
  } catch {
    // storage unavailable: nothing to clear
  }
}

// Own namespace segment, same reasoning as `orderStorageKeyFor` above.
export function sizingStorageKeyFor(persistKey: string): string {
  return `bmsui-datagrid:column-sizing:${persistKey}`;
}

/**
 * Keeps only finite positive numbers, clamped to `minWidth`; anything else in
 * a corrupt or hand-edited entry is dropped. Never throws.
 */
export function parseStoredWidths(raw: string | null, minWidth = 40): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};
    const widths: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        widths[id] = Math.max(minWidth, Math.round(value));
      }
    }
    return widths;
  } catch {
    return {};
  }
}

/** Any storage failure (blocked, private window, corrupt value) reads as "no overrides". */
export function readPersistedColumnSizing(persistKey: string): Record<string, number> {
  try {
    return parseStoredWidths(window.localStorage.getItem(sizingStorageKeyFor(persistKey)));
  } catch {
    return {};
  }
}

/** An empty `sizing` removes the entry, so a reset leaves nothing behind. */
export function writePersistedColumnSizing(persistKey: string, sizing: Record<string, number>): void {
  try {
    if (Object.keys(sizing).length === 0) window.localStorage.removeItem(sizingStorageKeyFor(persistKey));
    else window.localStorage.setItem(sizingStorageKeyFor(persistKey), JSON.stringify(sizing));
  } catch {
    // storage unavailable: the widths just won't survive a reload
  }
}
