import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

export interface UseLongPressOptions {
  /** Hold time before the long press fires, in ms. Default `500`. */
  threshold?: number;
  /** Pointer movement beyond this many px (either axis) cancels the press. Default `10`. */
  moveTolerance?: number;
  /** Turns the handlers inert. */
  disabled?: boolean;
  /** Called when a press starts (pointer down). */
  onStart?: (event: ReactPointerEvent<Element>) => void;
  /** Called when a started press ends before the threshold (released, moved, cancelled). */
  onCancel?: (event: ReactPointerEvent<Element>) => void;
}

export interface LongPressHandlers {
  onPointerDown: (event: ReactPointerEvent<Element>) => void;
  onPointerMove: (event: ReactPointerEvent<Element>) => void;
  onPointerUp: (event: ReactPointerEvent<Element>) => void;
  onPointerLeave: (event: ReactPointerEvent<Element>) => void;
  onPointerCancel: (event: ReactPointerEvent<Element>) => void;
  /** Swallows the click that follows a completed long press, so it doesn't also trigger the element's click action. */
  onClickCapture: (event: ReactMouseEvent<Element>) => void;
  /** Suppresses the native context menu (touch long-press) while a press is pending or just fired. */
  onContextMenu: (event: ReactMouseEvent<Element>) => void;
}

/**
 * Fires `callback` when a pointer (mouse primary button, touch, pen) is held
 * on the element for `threshold` ms without moving more than
 * `moveTolerance` px. Spread the returned handlers on the element. The click
 * that follows a long press is swallowed.
 *
 * @example
 * const longPress = useLongPress(() => openRowMenu(row), { threshold: 600 });
 * <tr {...longPress} onClick={() => openRow(row)}>…</tr>
 */
export function useLongPress(
  callback: (event: ReactPointerEvent<Element>) => void,
  options: UseLongPressOptions = {},
): LongPressHandlers {
  const latest = useRef({ callback, options });
  latest.current = { callback, options };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    press.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  // Disabled while a press is pending: drop it instead of firing later.
  const disabled = options.disabled;
  useEffect(() => {
    if (disabled) clear();
  }, [disabled, clear]);

  const cancel = useCallback(
    (event: ReactPointerEvent<Element>) => {
      if (press.current === null || press.current.pointerId !== event.pointerId) return;
      const pending = timer.current !== null;
      clear();
      if (pending) latest.current.options.onCancel?.(event);
    },
    [clear],
  );

  return useMemo<LongPressHandlers>(
    () => ({
      onPointerDown(event) {
        const { options: opts } = latest.current;
        if (opts.disabled) return;
        // Primary button only (touch and pen contacts report button 0 too).
        if (event.button !== 0) return;
        clear();
        fired.current = false;
        press.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
        opts.onStart?.(event);
        timer.current = setTimeout(() => {
          timer.current = null;
          if (latest.current.options.disabled) return;
          fired.current = true;
          latest.current.callback(event);
        }, opts.threshold ?? 500);
      },
      onPointerMove(event) {
        const start = press.current;
        if (!start || timer.current === null || start.pointerId !== event.pointerId) return;
        const tolerance = latest.current.options.moveTolerance ?? 10;
        if (Math.abs(event.clientX - start.x) > tolerance || Math.abs(event.clientY - start.y) > tolerance) {
          cancel(event);
        }
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onClickCapture(event) {
        if (fired.current) {
          fired.current = false;
          event.preventDefault();
          event.stopPropagation();
        }
      },
      onContextMenu(event) {
        if (timer.current !== null || fired.current) event.preventDefault();
      },
    }),
    [cancel, clear],
  );
}
