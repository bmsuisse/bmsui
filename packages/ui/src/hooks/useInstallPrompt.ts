import { useCallback, useEffect, useSyncExternalStore } from "react";
import { isIosSafari } from "../lib/platform";
import { useLocalStorageState } from "./useLocalStorageState";
import { useStandaloneMode } from "./useStandaloneMode";

/** The non-standard Chromium event (`beforeinstallprompt`); not in TypeScript's DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform = "native" | "ios" | "none";
export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

interface InstallStore {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
}

let state: InstallStore = { deferred: null, installed: false };
const listeners = new Set<() => void>();
let stopCapture: (() => void) | undefined;

function emit(next: InstallStore): void {
  state = next;
  for (const listener of listeners) listener();
}

/**
 * Starts listening for `beforeinstallprompt` and `appinstalled`. Call it once in your entry file,
 * before React renders: browsers often fire the event before the first component mounts, and it
 * fires only once. Safe to call repeatedly; returns a function that stops listening.
 */
export function captureInstallPrompt(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!stopCapture) {
    const onPrompt = (event: Event): void => {
      event.preventDefault();
      emit({ ...state, deferred: event as BeforeInstallPromptEvent });
    };
    const onInstalled = (): void => emit({ deferred: null, installed: true });
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    stopCapture = () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      stopCapture = undefined;
    };
  }
  return stopCapture;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test helper: forget a captured event and the installed flag. */
export function resetInstallPrompt(): void {
  stopCapture?.();
  emit({ deferred: null, installed: false });
}

export interface UseInstallPromptOptions {
  /** localStorage key remembering "Not now". @default "bmsui:pwa-install" */
  storageKey?: string;
  /** How many days "Not now" hides the prompt. @default 30 */
  snoozeDays?: number;
  /** Forces the platform, for tests and stories. By default: `native` once the browser offered an install, `ios` in Safari on iOS, else `none`. */
  platform?: InstallPlatform;
}

export interface UseInstallPromptResult {
  /** `native` (the browser can show its install dialog), `ios` (only manual "Add to Home Screen"), `none`. */
  platform: InstallPlatform;
  /** Installable here and not installed yet. */
  canInstall: boolean;
  /** Running installed (standalone) or the `appinstalled` event fired. */
  installed: boolean;
  /** "Not now" was chosen less than `snoozeDays` ago. */
  dismissed: boolean;
  /** Opens the browser's install dialog. `unavailable` when there is none (iOS: show the instructions instead). */
  promptInstall: () => Promise<InstallOutcome>;
  /** Remembers "Not now" for `snoozeDays`. */
  dismiss: () => void;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * State for an "install this app" prompt. Deliberately silent about *when* to ask: combine
 * `canInstall && !dismissed` with your own rule (second visit, after a first saved order, ...).
 * Call `captureInstallPrompt()` in your entry file so the browser's one-time event is not missed.
 */
export function useInstallPrompt({
  storageKey = "bmsui:pwa-install",
  snoozeDays = 30,
  platform: forced,
}: UseInstallPromptOptions = {}): UseInstallPromptResult {
  useEffect(() => captureInstallPrompt(), []);
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  const standalone = useStandaloneMode();
  const [dismissedAt, setDismissedAt] = useLocalStorageState<number | null>(storageKey, null);

  const platform: InstallPlatform = forced ?? (snapshot.deferred ? "native" : isIosSafari() ? "ios" : "none");
  const installed = snapshot.installed || standalone;
  const dismissed = dismissedAt !== null && Date.now() < dismissedAt + snoozeDays * DAY;

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    const event = state.deferred;
    if (!event) return "unavailable";
    // The event can be used once, whatever the user answers.
    emit({ ...state, deferred: null });
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  }, []);
  const dismiss = useCallback(() => setDismissedAt(Date.now()), [setDismissedAt]);

  return { platform, canInstall: platform !== "none" && !installed, installed, dismissed, promptInstall, dismiss };
}
