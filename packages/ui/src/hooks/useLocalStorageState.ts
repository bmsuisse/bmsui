import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

export interface UseLocalStorageStateOptions<T> {
  /** Value → stored string. Default `JSON.stringify`. */
  serialize?: (value: T) => string;
  /** Stored string → value. Default `JSON.parse`. A throw falls back to the default value. */
  deserialize?: (raw: string) => T;
  /** Follow writes from other tabs/windows (`storage` event). Default `true`. */
  syncTabs?: boolean;
}

export type SetLocalStorageState<T> = (value: T | ((previous: T) => T)) => void;

/** Values whose write failed (quota, blocked storage): kept for this page so the UI still works. */
const memory = new Map<string, string | null>();
const listeners = new Map<string, Set<() => void>>();

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, raw: string | null): void {
  try {
    if (raw === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, raw);
    memory.delete(key);
  } catch {
    memory.set(key, raw);
  }
  listeners.get(key)?.forEach((notify) => notify());
}

function subscribeKey(key: string, notify: () => void, syncTabs: boolean): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(notify);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== key) return;
    try {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    memory.delete(key);
    notify();
  };
  if (syncTabs) window.addEventListener("storage", onStorage);
  return () => {
    set.delete(notify);
    if (set.size === 0) listeners.delete(key);
    if (syncTabs) window.removeEventListener("storage", onStorage);
  };
}

/**
 * `useState` persisted in `localStorage` under `key`.
 *
 * - SSR-safe: the server render and hydration use `defaultValue`; the stored
 *   value is read right after (via `useSyncExternalStore`).
 * - Never throws: blocked storage (Safari private mode, disabled cookies) and
 *   quota errors fall back to an in-memory value for this page; unparsable
 *   stored data falls back to `defaultValue`.
 * - Every hook using the same key stays in sync, in this tab and (unless
 *   `syncTabs: false`) across tabs.
 *
 * Returns `[value, setValue, remove]`; `remove()` deletes the key, so the
 * value returns to `defaultValue`.
 *
 * @example
 * const [density, setDensity] = useLocalStorageState<"compact" | "comfortable">("grid.density", "comfortable");
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  options: UseLocalStorageStateOptions<T> = {},
): [T, SetLocalStorageState<T>, () => void] {
  const { syncTabs = true } = options;
  const latest = useRef({ defaultValue, options });
  latest.current = { defaultValue, options };

  const subscribe = useCallback((notify: () => void) => subscribeKey(key, notify, syncTabs), [key, syncTabs]);
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );

  const parse = useCallback((value: string | null): T => {
    const { defaultValue: fallback, options: opts } = latest.current;
    if (value === null) return fallback;
    try {
      return (opts.deserialize ?? (JSON.parse as (raw: string) => T))(value);
    } catch {
      return fallback;
    }
  }, []);

  // Re-parse only when the stored string or the key changes (two unset keys both read `null`, but
  // their defaults may differ); `defaultValue` literals don't churn identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` re-runs the parse for a new key
  const value = useMemo(() => parse(raw), [parse, raw, key]);

  const setValue = useCallback<SetLocalStorageState<T>>(
    (next) => {
      const previous = parse(readRaw(key));
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
      const serialize = latest.current.options.serialize ?? JSON.stringify;
      writeRaw(key, serialize(resolved));
    },
    [key, parse],
  );

  const remove = useCallback(() => writeRaw(key, null), [key]);

  return [value, setValue, remove];
}
