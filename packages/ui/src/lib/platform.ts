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
