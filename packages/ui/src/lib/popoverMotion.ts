import { cn } from "./utils";

/**
 * Class for a popover that holds a calendar. Enter: fade + scale from the trigger side (Radix
 * sets the transform origin). The exit is instant — Radix unmounts on close and only waits for
 * CSS keyframe animations, which this package doesn't ship.
 */
export const popoverMotion = (animated: boolean): string =>
  cn(
    "w-auto p-0",
    animated &&
      "origin-(--radix-popover-content-transform-origin) transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0 motion-reduce:starting:scale-100",
  );
