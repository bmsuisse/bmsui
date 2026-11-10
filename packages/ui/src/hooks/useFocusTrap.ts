import { type RefCallback, type RefObject, useEffect, useRef, useState } from "react";

export interface UseFocusTrapOptions {
  /** Trap only while `true` (e.g. while a panel is open). Default `true`. */
  enabled?: boolean;
  /** Move focus back to what had it before the trap activated, on deactivate/unmount. Default `true`. */
  restoreFocus?: boolean;
  /**
   * Where focus goes on activation: `"first"` tabbable element (default), the
   * `"container"` itself (gets `tabIndex=-1` if needed), a ref to a specific
   * element, or `false` to leave focus alone.
   */
  initialFocus?: "first" | "container" | RefObject<HTMLElement | null> | false;
}

const TABBABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
].join(",");

/** Tabbable descendants of `container` in DOM order (positive `tabIndex` ordering is not modelled). */
export function getTabbable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter((el) => {
    if (el.tabIndex < 0) return false;
    if (el.closest("[hidden],[inert]")) return false;
    const view = el.ownerDocument.defaultView;
    const style = view?.getComputedStyle(el);
    return !style || (style.display !== "none" && style.visibility !== "hidden");
  });
}

/**
 * Keeps keyboard focus inside an element: Tab on the last tabbable element
 * wraps to the first, Shift+Tab on the first wraps to the last, and focus that
 * escapes (a click outside, programmatic focus) is pulled back. On deactivate
 * it restores focus to the element that had it before. Escape is not handled —
 * close the surface yourself (pair with `useHotkeys`).
 *
 * Radix `Dialog`/`Sheet` already trap focus; use this for custom overlays,
 * inline editors and non-modal panels that should hold focus.
 *
 * @returns a callback ref for the container.
 *
 * @example
 * const trapRef = useFocusTrap<HTMLDivElement>({ enabled: open });
 * return open ? <div ref={trapRef} role="dialog">…</div> : null;
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  options: UseFocusTrapOptions = {},
): RefCallback<T> {
  const { enabled = true, restoreFocus = true } = options;
  const [container, setContainer] = useState<T | null>(null);
  const initialFocus = useRef(options.initialFocus);
  initialFocus.current = options.initialFocus;
  const restore = useRef(restoreFocus);
  restore.current = restoreFocus;

  useEffect(() => {
    if (!enabled || !container) return;
    const doc = container.ownerDocument;
    const previouslyFocused = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;

    const focusContainer = () => {
      if (!container.hasAttribute("tabindex")) container.tabIndex = -1;
      container.focus({ preventScroll: true });
    };

    const initial = initialFocus.current ?? "first";
    if (initial !== false && !container.contains(doc.activeElement)) {
      if (initial === "container") focusContainer();
      else if (initial === "first") {
        const first = getTabbable(container)[0];
        if (first) first.focus();
        else focusContainer();
      } else if (initial.current) initial.current.focus();
      else focusContainer();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const tabbable = getTabbable(container);
      if (tabbable.length === 0) {
        event.preventDefault();
        focusContainer();
        return;
      }
      const first = tabbable[0]!;
      const last = tabbable[tabbable.length - 1]!;
      const active = doc.activeElement;
      if (event.shiftKey && (active === first || active === container || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (target && !container.contains(target)) {
        const first = getTabbable(container)[0];
        if (first) first.focus();
        else focusContainer();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    doc.addEventListener("focusin", onFocusIn);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      doc.removeEventListener("focusin", onFocusIn);
      if (restore.current && previouslyFocused?.isConnected && !previouslyFocused.closest("[inert]")) {
        // After this commit, so a trap handing over to another surface doesn't fight it.
        const target = previouslyFocused;
        queueMicrotask(() => {
          const active = doc.activeElement;
          if (!active || active === doc.body || !active.isConnected || container.contains(active) || !container.isConnected) {
            target.focus({ preventScroll: true });
          }
        });
      }
    };
  }, [enabled, container]);

  return setContainer as RefCallback<T>;
}
