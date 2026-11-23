import { useCallback, useEffect, useRef, useState } from "react";

export type ServiceWorkerUpdateStatus = "idle" | "available" | "updating" | "blocked";

export interface UseServiceWorkerUpdateOptions {
  /** A new service worker is waiting (vite-plugin-pwa's `needRefresh`, workbox's `waiting` event). */
  needRefresh: boolean;
  /** The app was cached for the first time and now works offline (vite-plugin-pwa's `offlineReady`). */
  offlineReady?: boolean;
  /** Activates the waiting worker and reloads, e.g. `() => updateServiceWorker(true)`. */
  onUpdate: () => void | Promise<void>;
  /** Return `false` while there is unsaved work; the update is then `blocked` instead of discarding it. */
  canReload?: () => boolean;
  /** How long "Later" hides the prompt, in ms. @default 14_400_000 (4 hours) */
  snoozeMs?: number;
  /** If the page has not reloaded this long after `onUpdate` settled, reload it. @default 8000 */
  reloadTimeoutMs?: number;
  /** Replaces `location.reload()` for the fallback above. */
  reload?: () => void;
}

export interface UseServiceWorkerUpdateResult {
  /** `idle` (nothing to show, or snoozed), `available`, `updating` (after the click), `blocked` (`canReload` said no). */
  status: ServiceWorkerUpdateStatus;
  /** Runs `onUpdate` once (double clicks are ignored), unless `canReload()` is `false`. */
  update: () => void;
  /** Hides the prompt for `snoozeMs`, then shows it again if an update is still waiting. */
  snooze: () => void;
  /** `offlineReady` until `acknowledgeOfflineReady()` was called, so it can be announced once. */
  offlineReady: boolean;
  acknowledgeOfflineReady: () => void;
}

const MAX_TIMEOUT = 2_147_483_647;

/**
 * The state machine behind a "new version available" prompt. It is headless and takes the
 * service-worker state from the caller, so it works with vite-plugin-pwa, workbox-window or a
 * hand-written registration. Pair it with `registerType: "prompt"`; with `autoUpdate` there is
 * nothing to ask. See `UpdatePrompt` for the ready-made bar.
 */
export function useServiceWorkerUpdate({
  needRefresh,
  offlineReady = false,
  onUpdate,
  canReload,
  snoozeMs = 4 * 60 * 60 * 1000,
  reloadTimeoutMs = 8000,
  reload,
}: UseServiceWorkerUpdateOptions): UseServiceWorkerUpdateResult {
  const [updating, setUpdating] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const latest = useRef({ onUpdate, canReload, reload });
  latest.current = { onUpdate, canReload, reload };
  const busy = useRef(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(reloadTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!snoozed) return;
    const timer = setTimeout(() => setSnoozed(false), Math.min(snoozeMs, MAX_TIMEOUT));
    return () => clearTimeout(timer);
  }, [snoozed, snoozeMs]);

  useEffect(() => {
    if (!offlineReady) setAcknowledged(false);
  }, [offlineReady]);

  const update = useCallback(() => {
    if (busy.current) return;
    if (latest.current.canReload && !latest.current.canReload()) {
      setBlocked(true);
      return;
    }
    busy.current = true;
    setBlocked(false);
    setUpdating(true);
    const fail = (): void => {
      busy.current = false;
      if (mounted.current) setUpdating(false);
    };
    const armFallback = (): void => {
      if (!mounted.current) return;
      reloadTimer.current = setTimeout(() => {
        // The user may have started editing while the worker was activating.
        if (latest.current.canReload && !latest.current.canReload()) {
          fail();
          setBlocked(true);
          return;
        }
        (latest.current.reload ?? (() => window.location.reload()))();
      }, reloadTimeoutMs);
    };
    try {
      Promise.resolve(latest.current.onUpdate()).then(armFallback, fail);
    } catch {
      fail();
    }
  }, [reloadTimeoutMs]);

  const snooze = useCallback(() => {
    setBlocked(false);
    setSnoozed(true);
  }, []);
  const acknowledgeOfflineReady = useCallback(() => setAcknowledged(true), []);

  const status: ServiceWorkerUpdateStatus = !needRefresh || (snoozed && !updating)
    ? "idle"
    : updating
      ? "updating"
      : blocked
        ? "blocked"
        : "available";

  return { status, update, snooze, offlineReady: offlineReady && !acknowledged, acknowledgeOfflineReady };
}
