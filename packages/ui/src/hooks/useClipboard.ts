import { useCallback, useEffect, useRef, useState } from "react";

export interface UseClipboardOptions {
  /** How long `copied` stays `true` after a successful copy, in ms. Default `2000`. */
  timeout?: number;
}

export interface UseClipboardResult {
  /**
   * Writes `text` to the clipboard. Resolves `true` on success (sets `copied`
   * and restarts its reset timer), `false` on failure (sets `error`). Never
   * rejects.
   */
  copy: (text: string) => Promise<boolean>;
  /** `true` for `timeout` ms after the last successful copy. */
  copied: boolean;
  /** The last failure, cleared by the next successful copy or `reset()`. */
  error: Error | null;
  /** Clears `copied` and `error` now. */
  reset: () => void;
}

/** `document.execCommand("copy")` through a hidden textarea, for browsers/contexts without `navigator.clipboard` (plain http). */
function legacyCopy(text: string): void {
  if (typeof document === "undefined") throw new Error("Clipboard is not available");
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  const active = document.activeElement as HTMLElement | null;
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = typeof document.execCommand === "function" && document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
    active?.focus?.();
  }
  if (!ok) throw new Error("Copy command was rejected");
}

/**
 * Copy-to-clipboard with a transient `copied` flag (for a copy → check icon
 * flip) and an `error` state. Uses `navigator.clipboard.writeText` and falls
 * back to a hidden-textarea `execCommand("copy")` when the async Clipboard API
 * is missing (insecure context, old browsers). Rapid re-copies restart the
 * reset timer; the timer is cleared on unmount.
 *
 * @example
 * const { copy, copied } = useClipboard();
 * <Button onClick={() => void copy(url)}>{copied ? "Copied" : "Copy link"}</Button>
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardResult {
  const { timeout = 2000 } = options;
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setCopied(false);
    setError(null);
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
          await navigator.clipboard.writeText(text);
        } else {
          legacyCopy(text);
        }
      } catch (err) {
        if (mounted.current) {
          setCopied(false);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        return false;
      }
      if (!mounted.current) return true;
      setError(null);
      setCopied(true);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        setCopied(false);
      }, timeout);
      return true;
    },
    [timeout],
  );

  return { copy, copied, error, reset };
}
