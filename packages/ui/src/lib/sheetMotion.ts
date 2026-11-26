import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { EASE_IN, prefersReducedMotion } from "./motion";

export type SheetSide = "top" | "right" | "bottom" | "left";

const offscreen: Record<SheetSide, string> = {
  top: "translateY(-100%)",
  right: "translateX(100%)",
  bottom: "translateY(100%)",
  left: "translateX(-100%)",
};

const ENTER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const ENTER_MS = 280;
const EXIT_MS = 200;
/** Extra time past the exit duration before the watchdog forces the exit to its end. */
const WATCHDOG_SLACK_MS = 400;

type Frames = Keyframe[];

export interface PresenceMotion {
  enter: Frames;
  exit: Frames;
  enterMs?: number;
  exitMs?: number;
  enterEasing?: string;
}

export function sheetMotion(side: SheetSide): PresenceMotion {
  return {
    enter: [{ transform: offscreen[side] }, { transform: "none" }],
    exit: [{ transform: "none" }, { transform: offscreen[side] }],
    enterEasing: ENTER_EASE,
  };
}

export const fadeMotion: PresenceMotion = {
  enter: [{ opacity: 0 }, { opacity: 1 }],
  exit: [{ opacity: 1 }, { opacity: 0 }],
  enterEasing: "ease-out",
};

/** Jumps every running animation on `el` to its end so Base UI's "wait for animations" resolves. */
function finishAll(el: HTMLElement, ...tracked: Array<Animation | null>): void {
  const all = new Set<Animation>(typeof el.getAnimations === "function" ? el.getAnimations() : []);
  for (const animation of tracked) if (animation) all.add(animation);
  for (const animation of all) {
    // Leave CSS transitions/animations alone (a shadow fading while dragging is healthy); only the
    // Web Animations this module starts can stall the timeline.
    const css = typeof CSSTransition !== "undefined" && (animation instanceof CSSTransition || animation instanceof CSSAnimation);
    if (!css && animation.playState !== "finished") animation.finish();
  }
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Enter/exit animation for a popup that Base UI keeps mounted until its animations finish.
 *
 * The resting state is always "visible": the enter animation only plays *from* off-screen
 * (`fill: backwards`), so if it never runs (a backgrounded iOS tab, no `requestAnimationFrame`)
 * the sheet is simply there instead of sitting off-screen under a live overlay. The exit holds
 * its end state (`fill: forwards`) until Base UI unmounts; a watchdog finishes it if the
 * browser stalls the timeline, so a closed sheet can never linger as an invisible click-catcher.
 * Re-opening during an exit cancels the exit first.
 */
export function usePresenceMotion(ref: RefObject<HTMLElement | null>, open: boolean, motion: PresenceMotion): void {
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const exitRef = useRef<Animation | null>(null);
  const enterRef = useRef<Animation | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wasOpen = useRef<boolean | undefined>(undefined);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    const previous = wasOpen.current;
    wasOpen.current = open;
    if (!el || typeof el.animate !== "function" || prefersReducedMotion()) return;
    const current = motionRef.current;

    if (open) {
      clearTimeout(watchdogRef.current);
      exitRef.current?.cancel();
      exitRef.current = null;
      const enterMs = current.enterMs ?? ENTER_MS;
      enterRef.current = el.animate(current.enter, {
        duration: enterMs,
        easing: current.enterEasing ?? ENTER_EASE,
        fill: "backwards",
      });
      // A stalled enter would also hold the popup mounted after a later close (Base UI awaits every
      // finite animation), so it gets the same bound.
      const entering = enterRef.current;
      watchdogRef.current = setTimeout(() => finishAll(el, entering), enterMs + WATCHDOG_SLACK_MS);
      return;
    }

    if (previous === true) {
      clearTimeout(watchdogRef.current);
      enterRef.current?.cancel();
      enterRef.current = null;
      const exitMs = current.exitMs ?? EXIT_MS;
      const animation = el.animate(current.exit, { duration: exitMs, easing: EASE_IN, fill: "forwards" });
      exitRef.current = animation;
      watchdogRef.current = setTimeout(() => finishAll(el, animation), exitMs + WATCHDOG_SLACK_MS);
    }
  }, [open, ref]);

  useEffect(
    () => () => {
      clearTimeout(watchdogRef.current);
    },
    [],
  );
}
