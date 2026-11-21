/**
 * Whether the current runtime is Windows, based on the UA string. Returns
 * `false` outside a browser (SSR, tests) so platform-dependent UI falls back
 * to the non-Windows default rather than guessing.
 */
export function isWindowsPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Windows/i.test(navigator.userAgent);
}

export type ConfirmButtonPlacement = "leading" | "trailing";

/**
 * Where a dialog's affirmative/confirm button should sit, matching each
 * platform's own system convention: Windows dialogs place OK/Save on the
 * left (Cancel on the right); every other platform we target — iOS/iPadOS,
 * macOS, Android, Linux — places the affirmative action on the right (the
 * iOS/macOS Human Interface Guidelines require this, and it's the de facto
 * default everywhere else too). Windows is the one exception, so this is
 * driven entirely by `isWindowsPlatform`.
 */
export function getConfirmButtonPlacement(): ConfirmButtonPlacement {
  return isWindowsPlatform() ? "leading" : "trailing";
}

/**
 * Whether the current runtime is Apple (macOS, iOS, iPadOS), where shortcuts
 * are spelled with ⌘/⌥/⇧. `false` outside a browser.
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform) || /Mac OS X|iPhone|iPad/i.test(nav.userAgent);
}

/** iPhone, iPad or iPod, including iPadOS 13+, which reports itself as a Mac but has a touch screen. `false` outside a browser. */
export function isIosPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  return /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

/**
 * Safari on iOS/iPadOS (not Chrome, Firefox, Edge, Opera or an in-app browser on iOS, whose "Add to Home Screen"
 * lives in different places). `false` elsewhere and outside a browser.
 */
export function isIosSafari(): boolean {
  if (!isIosPlatform()) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram/i.test(navigator.userAgent);
}
