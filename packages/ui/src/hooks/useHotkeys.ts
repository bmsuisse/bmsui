import { useEffect, useRef } from "react";

/**
 * One keyboard shortcut.
 *
 * `keys` grammar:
 * - a combo is `+`-separated modifiers followed by one key: `mod+k`,
 *   `shift+?`, `alt+arrowup`, `escape`. Modifiers: `mod` (⌘ on Apple
 *   platforms, Ctrl elsewhere), `ctrl`, `meta`, `alt`, `shift`.
 * - a chord is space-separated combos pressed one after the other: `g i`.
 * - named keys: `escape`/`esc`, `enter`, `space`, `tab`, `backspace`,
 *   `delete`, `up`/`down`/`left`/`right` (or `arrowup` …), `plus` for `+`.
 *
 * Shift: a letter/digit combo without `shift` does not fire while Shift is
 * held. A punctuation key (`?`, `/`, `!`) ignores Shift unless `shift` is
 * written, because whether it needs Shift depends on the keyboard layout.
 */
export interface Hotkey {
  /** `"mod+k"`, `"shift+?"`, `"escape"`, `"g i"` (chord). */
  keys: string;
  /** Called when the combo (or the last step of the chord) matches. */
  handler: (event: KeyboardEvent) => void;
  /** `false` turns this one shortcut off without unregistering it. Default `true`. */
  enabled?: boolean;
  /** Fire while focus is in an input/textarea/select/contenteditable. Default from options (`false`). */
  allowInInputs?: boolean;
  /** Call `event.preventDefault()` on a match. Default from options (`true`). */
  preventDefault?: boolean;
}

export interface UseHotkeysOptions {
  /** `false` turns every shortcut of this hook off. Default `true`. */
  enabled?: boolean;
  /** Default for {@link Hotkey.allowInInputs}. Default `false`. */
  allowInInputs?: boolean;
  /** Default for {@link Hotkey.preventDefault}. Default `true`. */
  preventDefault?: boolean;
  /** How long a chord waits for its next key, in ms. Default `1000`. */
  chordTimeoutMs?: number;
}

const KEY_ALIASES: Record<string, string> = {
  esc: "escape",
  space: " ",
  spacebar: " ",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  return: "enter",
  del: "delete",
  plus: "+",
};

const MODIFIER_KEYS = new Set(["shift", "control", "alt", "meta", "os", "altgraph", "capslock"]);

interface Combo {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  mod: boolean;
}

/** Whether we run on macOS/iOS/iPadOS, where `mod` is ⌘. `false` outside a browser. */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform) || /Mac OS X|iPhone|iPad/.test(nav.userAgent ?? "");
}

function parseCombo(text: string): Combo | null {
  // "+" alone (or a trailing "++") means the plus key itself.
  const raw = text.trim().toLowerCase();
  const parts = raw.endsWith("++")
    ? [...raw.slice(0, -2).split("+").filter(Boolean), "+"]
    : raw === "+"
      ? ["+"]
      : raw.split("+").map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (last === undefined) return null;
  const mods = new Set(parts.slice(0, -1));
  return {
    key: KEY_ALIASES[last] ?? last,
    ctrl: mods.has("ctrl") || mods.has("control"),
    meta: mods.has("meta") || mods.has("cmd") || mods.has("command"),
    alt: mods.has("alt") || mods.has("option"),
    shift: mods.has("shift"),
    mod: mods.has("mod"),
  };
}

/** Split `keys` into chord steps (`"g i"` → two combos). `" "`-only strings mean the space key. */
function parseKeys(keys: string): Combo[] {
  const trimmed = keys.trim();
  if (trimmed === "") return keys.length > 0 ? [parseCombo("space")!] : [];
  return trimmed
    .split(/\s+/)
    .map(parseCombo)
    .filter((c): c is Combo => c !== null);
}

function isPunctuation(key: string): boolean {
  return key.length === 1 && !/[a-z0-9 ]/.test(key);
}

interface KeySnapshot {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

function matchesCombo(combo: Combo, event: KeySnapshot, isApple: boolean): boolean {
  const wantsCtrl = combo.ctrl || (combo.mod && !isApple);
  const wantsMeta = combo.meta || (combo.mod && isApple);
  if (event.ctrlKey !== wantsCtrl || event.metaKey !== wantsMeta || event.altKey !== combo.alt) return false;
  if (combo.shift ? !event.shiftKey : event.shiftKey && !isPunctuation(combo.key)) return false;

  const key = event.key.toLowerCase();
  if (key === combo.key) return true;
  // Alt (Option on a Mac) and some layouts change event.key ("alt+k" → "˚"):
  // fall back to the physical key for letters and digits.
  if (/^[a-z]$/.test(combo.key)) return event.code === `Key${combo.key.toUpperCase()}`;
  if (/^[0-9]$/.test(combo.key)) return event.code === `Digit${combo.key}`;
  return false;
}

/** Whether the target is a typing surface where shortcuts stay silent by default. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest("[contenteditable=''],[contenteditable='true']")) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Registers global (window `keydown`) keyboard shortcuts for as long as the
 * component is mounted. The definitions are read from a ref, so passing a new
 * array every render does not re-subscribe. The first matching shortcut wins.
 *
 * Single unmodified character keys (`"c"`, `"/"`) are easy to trigger by
 * accident (WCAG 2.1.4): give users a way to turn them off (`enabled`), or
 * prefer `mod+` combos.
 *
 * @example
 * useHotkeys([
 *   { keys: "mod+k", handler: openPalette },
 *   { keys: "shift+?", handler: openShortcutSheet },
 *   { keys: "g i", handler: () => navigate("/inbox") },
 *   { keys: "escape", handler: close, allowInInputs: true },
 * ]);
 */
export function useHotkeys(hotkeys: Hotkey[], options: UseHotkeysOptions = {}): void {
  const latest = useRef({ hotkeys, options });
  latest.current = { hotkeys, options };
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    const isApple = isApplePlatform();
    let buffer: { snapshot: KeySnapshot; at: number }[] = [];

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      if (MODIFIER_KEYS.has(event.key.toLowerCase())) return;
      const { hotkeys: list, options: opts } = latest.current;
      const timeout = opts.chordTimeoutMs ?? 1000;
      const now = Date.now();
      const snapshot: KeySnapshot = {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      };
      buffer.push({ snapshot, at: now });
      // Keep only the trailing run of keys each pressed within `timeout` of the next.
      for (let i = buffer.length - 1; i > 0; i--) {
        if (buffer[i]!.at - buffer[i - 1]!.at > timeout) {
          buffer = buffer.slice(i);
          break;
        }
      }
      buffer = buffer.slice(-8);
      const typing = isTypingTarget(event.target);

      for (const hotkey of list) {
        if (hotkey.enabled === false) continue;
        if (typing && !(hotkey.allowInInputs ?? opts.allowInInputs ?? false)) continue;
        const steps = parseKeys(hotkey.keys);
        if (steps.length === 0 || steps.length > buffer.length) continue;
        const tail = buffer.slice(-steps.length);
        if (!steps.every((step, i) => matchesCombo(step, tail[i]!.snapshot, isApple))) continue;
        if (hotkey.preventDefault ?? opts.preventDefault ?? true) event.preventDefault();
        buffer = [];
        hotkey.handler(event);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

const MAC_SYMBOLS: Record<string, string> = { ctrl: "⌃", alt: "⌥", shift: "⇧", meta: "⌘" };
const KEY_LABELS: Record<string, [mac: string, other: string]> = {
  escape: ["Esc", "Esc"],
  enter: ["↵", "Enter"],
  " ": ["Space", "Space"],
  tab: ["⇥", "Tab"],
  backspace: ["⌫", "Backspace"],
  delete: ["⌦", "Del"],
  arrowup: ["↑", "↑"],
  arrowdown: ["↓", "↓"],
  arrowleft: ["←", "←"],
  arrowright: ["→", "→"],
};

/**
 * Human-readable label for a hotkey string, in the platform's convention:
 * `formatHotkey("mod+k")` → `"⌘K"` on Apple platforms, `"Ctrl+K"` elsewhere.
 * Chords keep their steps space-separated (`"g i"` → `"G I"`). Pass
 * `platform` to force one (SSR, docs, tests).
 */
export function formatHotkey(keys: string, platform?: "mac" | "other"): string {
  const mac = platform ? platform === "mac" : isApplePlatform();
  return parseKeys(keys)
    .map((combo) => {
      const mods: string[] = [];
      if (combo.ctrl || (combo.mod && !mac)) mods.push("ctrl");
      if (combo.alt) mods.push("alt");
      if (combo.shift) mods.push("shift");
      if (combo.meta || (combo.mod && mac)) mods.push("meta");
      const label = KEY_LABELS[combo.key];
      const key = label ? label[mac ? 0 : 1] : combo.key.length === 1 ? combo.key.toUpperCase() : capitalize(combo.key);
      if (mac) return mods.map((m) => MAC_SYMBOLS[m]).join("") + key;
      const names = mods.map((m) => (m === "ctrl" ? "Ctrl" : m === "meta" ? "Win" : capitalize(m)));
      return [...names, key].join("+");
    })
    .join(" ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
