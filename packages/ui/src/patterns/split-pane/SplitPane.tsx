import type {
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from "react";
import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "../../lib/useIsomorphicLayoutEffect";
import { cn } from "../../lib/utils";

/** A pane size limit: a number is a percentage of the container, `"240px"` is pixels. */
export type SplitPaneLimit = number | `${number}px`;

export interface SplitPaneLabels {
  /** Accessible name of the separator between pane `index` and `index + 1`. */
  separator: (index: number) => string;
}

export const defaultSplitPaneLabels: SplitPaneLabels = {
  separator: () => "Resize panes",
};

export interface SplitPaneProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** One child per pane (two or more). `SplitPanePanel` lets you set `minSize`/`maxSize` per pane. */
  children: ReactNode;
  /** `horizontal` = panes side by side (vertical separator); `vertical` = stacked. @default "horizontal" */
  direction?: "horizontal" | "vertical";
  /** Starting sizes in percent (normalised to sum to 100). Defaults to equal panes. Also the double-click reset target. */
  defaultSizes?: number[];
  /** Controlled sizes in percent. */
  sizes?: number[];
  /** Fires with the new percentages on every drag step/keypress. */
  onSizesChange?: (sizes: number[]) => void;
  /** Fires once when a drag or keypress ends — the place to save to a server. */
  onSizesCommit?: (sizes: number[]) => void;
  /** Default minimum for panes without their own `minSize`. @default "48px" */
  minSize?: SplitPaneLimit;
  /** Remember sizes in `localStorage` under this key (best effort, ignored when storage is blocked). */
  storageKey?: string;
  /** Arrow-key step in percent; Shift multiplies by 5. @default 2 */
  keyboardStep?: number;
  labels?: Partial<SplitPaneLabels>;
  /** Ease pane sizes over 150ms on keyboard steps and double-click reset (never while dragging; off under reduced motion). @default true */
  animated?: boolean;
}

export interface SplitPanePanelProps extends HTMLAttributes<HTMLDivElement> {
  minSize?: SplitPaneLimit;
  maxSize?: SplitPaneLimit;
}

/**
 * Optional wrapper for a `SplitPane` child to give that pane its own
 * `minSize`/`maxSize`. Any other child works as a pane as-is.
 */
export function SplitPanePanel({ minSize: _min, maxSize: _max, className, ...props }: SplitPanePanelProps): ReactElement {
  return <div className={cn("h-full min-h-0 w-full min-w-0", className)} {...props} />;
}

const STORAGE_PREFIX = "bmsui:split-pane:";

function readStored(key: string | undefined, count: number): number[] | null {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (
      Array.isArray(parsed) &&
      parsed.length === count &&
      parsed.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)
    ) {
      return normalise(parsed as number[]);
    }
  } catch {
    // storage blocked or malformed
  }
  return null;
}

function writeStored(key: string | undefined, sizes: number[]): void {
  if (!key) return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(sizes.map((s) => Math.round(s * 100) / 100)));
  } catch {
    // ignore
  }
}

function normalise(sizes: number[]): number[] {
  const sum = sizes.reduce((a, b) => a + b, 0);
  if (!sum) return sizes.map(() => 100 / sizes.length);
  return sizes.map((s) => (s / sum) * 100);
}

function toPercent(limit: SplitPaneLimit | undefined, containerPx: number, fallback: number): number {
  if (limit == null) return fallback;
  if (typeof limit === "number") return limit;
  const px = Number.parseFloat(limit);
  if (!containerPx || !Number.isFinite(px)) return fallback;
  return (px / containerPx) * 100;
}

/**
 * Two or more panes with draggable, keyboard-operable separators between them
 * (master/detail, editor + preview, list + inspector). Sizes are percentages;
 * limits can be percentages or `"240px"`. Separators are `role="separator"`
 * with `aria-valuenow`, arrows move them (Shift = bigger steps), Home/End jump
 * to the limits, double-click resets. `storageKey` remembers the layout.
 * For the app's left navigation use `Sidebar resizable` instead.
 */
export function SplitPane({
  children,
  direction = "horizontal",
  defaultSizes,
  sizes: controlled,
  onSizesChange,
  onSizesCommit,
  minSize = "48px",
  storageKey,
  keyboardStep = 2,
  labels,
  animated = true,
  className,
  style,
  ...props
}: SplitPaneProps): ReactElement {
  const l = { ...defaultSplitPaneLabels, ...labels };
  const panes = Children.toArray(children);
  const count = panes.length;
  const horizontal = direction === "horizontal";
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const resetSizes = useCallback(
    () => normalise(defaultSizes?.length === count ? defaultSizes : Array.from({ length: count }, () => 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, (defaultSizes ?? []).join(",")],
  );
  // Start from the defaults so server and client markup match; the stored layout is
  // applied before paint on the client (layout effect), so there's no visible jump.
  const [internal, setInternal] = useState<number[]>(resetSizes);
  useIsomorphicLayoutEffect(() => {
    const stored = readStored(storageKey, count);
    if (stored) setInternal(stored);
    // Only on mount / when the storage key changes; pane-count changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  // Pane count changed (a pane was added/removed): start over from the defaults.
  useEffect(() => {
    if (internal.length !== count) setInternal(readStored(storageKey, count) ?? resetSizes());
  }, [count, internal.length, resetSizes, storageKey]);
  const sizes = controlled && controlled.length === count ? controlled : internal.length === count ? internal : resetSizes();
  const sizesRef = useRef(sizes);
  sizesRef.current = sizes;
  const [dragging, setDragging] = useState<number | null>(null);
  // Panes ease to new sizes on keyboard steps / reset, never while pointer-dragging and
  // not before the first paint (the stored layout is applied in a layout effect).
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const easeSizes = animated && settled && dragging == null;
  const drag = useRef<{ index: number; start: number; from: number[]; px: number } | null>(null);

  const containerPx = (): number => {
    const el = rootRef.current;
    if (!el) return 0;
    return horizontal ? el.clientWidth : el.clientHeight;
  };

  const limits = (index: number, px: number): { min: number; max: number } => {
    const pane = panes[index];
    const own = isValidElement<SplitPanePanelProps>(pane) && pane.type === SplitPanePanel ? pane.props : undefined;
    const min = toPercent(own?.minSize ?? minSize, px, 0);
    const max = toPercent(own?.maxSize, px, 100);
    return { min: Math.max(0, Math.min(min, 100)), max: Math.max(min, Math.min(max, 100)) };
  };

  const apply = (next: number[], commit: boolean): void => {
    if (!controlled) setInternal(next);
    onSizesChange?.(next);
    if (commit) {
      writeStored(storageKey, next);
      onSizesCommit?.(next);
    }
  };

  /** Moves separator `index` so pane `index` gets `target` percent, taking the difference from pane `index + 1`. */
  const resize = (index: number, target: number, from: number[], px: number): number[] => {
    const a = limits(index, px);
    const b = limits(index + 1, px);
    const pair = (from[index] ?? 0) + (from[index + 1] ?? 0);
    let first = Math.min(Math.max(target, a.min), a.max);
    let second = pair - first;
    if (second < b.min) {
      second = b.min;
      first = pair - second;
    } else if (second > b.max) {
      second = b.max;
      first = pair - second;
    }
    // Both limits can't hold at once (container too small): keep the pair's total, favour the first pane's min.
    first = Math.max(0, Math.min(first, pair));
    const next = [...from];
    next[index] = first;
    next[index + 1] = pair - first;
    return next;
  };

  const onPointerDown = (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    drag.current = { index, start: horizontal ? event.clientX : event.clientY, from: sizesRef.current, px: containerPx() };
    setDragging(index);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !d.px) return;
    const delta = (((horizontal ? event.clientX : event.clientY) - d.start) / d.px) * 100;
    apply(resize(d.index, (d.from[d.index] ?? 0) + delta, d.from, d.px), false);
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.current) {
      drag.current = null;
      setDragging(null);
      apply(sizesRef.current, true);
    }
  };

  const onKeyDown = (index: number) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const px = containerPx();
    const current = sizes[index] ?? 0;
    const step = keyboardStep * (event.shiftKey ? 5 : 1);
    const decrease = horizontal ? "ArrowLeft" : "ArrowUp";
    const increase = horizontal ? "ArrowRight" : "ArrowDown";
    let target: number;
    if (event.key === decrease) target = current - step;
    else if (event.key === increase) target = current + step;
    else if (event.key === "Home") target = limits(index, px).min;
    else if (event.key === "End") target = limits(index, px).max;
    else if (event.key === "Enter") {
      apply(resetSizes(), true);
      event.preventDefault();
      return;
    } else return;
    event.preventDefault();
    apply(resize(index, target, sizes, px), true);
  };

  return (
    <div
      ref={rootRef}
      data-testid="split-pane"
      data-direction={direction}
      data-resizing={dragging != null ? "" : undefined}
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 overflow-hidden",
        horizontal ? "flex-row" : "flex-col",
        dragging != null && (horizontal ? "cursor-col-resize select-none" : "cursor-row-resize select-none"),
        className,
      )}
      style={style}
      {...props}
    >
      {panes.map((pane, index) => {
        const paneId = `${baseId}-pane-${index}`;
        const size = sizes[index] ?? 0;
        const { min, max } = limits(index, containerPx());
        return (
          <Fragment key={isValidElement(pane) && pane.key != null ? pane.key : index}>
            <div
              id={paneId}
              data-slot="split-pane-pane"
              data-testid="split-pane-pane"
              // Iframes/embeds under the pointer would swallow pointermove while dragging.
              className={cn(
                "relative min-h-0 min-w-0 overflow-auto",
                dragging != null && "pointer-events-none",
                easeSizes && "transition-[flex-grow] duration-150 ease-out motion-reduce:transition-none",
              )}
              style={{ flex: `${size} 1 0px` }}
            >
              {pane}
            </div>
            {index < count - 1 ? (
              <div
                role="separator"
                tabIndex={0}
                aria-orientation={horizontal ? "vertical" : "horizontal"}
                aria-controls={paneId}
                aria-label={l.separator(index)}
                aria-valuenow={Math.round(size)}
                aria-valuemin={Math.round(min)}
                aria-valuemax={Math.round(max)}
                data-testid="split-pane-separator"
                data-active={dragging === index ? "" : undefined}
                onPointerDown={onPointerDown(index)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onDoubleClick={() => apply(resetSizes(), true)}
                onKeyDown={onKeyDown(index)}
                className={cn(
                  "group relative z-10 flex shrink-0 touch-none items-center justify-center bg-foreground/10 outline-none transition-colors duration-150 ease-out dark:bg-border",
                  horizontal ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
                  // 9px hit area centred on the 1px line.
                  horizontal ? "before:absolute before:inset-y-0 before:-left-1 before:-right-1" : "before:absolute before:inset-x-0 before:-top-1 before:-bottom-1",
                  "hover:bg-ring/50 focus-visible:bg-ring data-[active]:bg-ring dark:hover:bg-ring/60 dark:focus-visible:bg-ring dark:data-[active]:bg-ring",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute rounded-full border border-foreground/20 bg-background shadow-xs transition-[border-color,background-color,height,width] duration-150 ease-out motion-reduce:transition-colors group-hover:border-ring/70 group-focus-visible:border-ring group-focus-visible:bg-ring group-data-[active]:border-ring group-data-[active]:bg-ring dark:border-foreground/25 dark:bg-muted dark:group-focus-visible:bg-ring dark:group-data-[active]:bg-ring",
                    horizontal
                      ? "h-6 w-1.5 group-hover:h-8 group-data-[active]:h-8"
                      : "h-1.5 w-6 group-hover:w-8 group-data-[active]:w-8",
                  )}
                />
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}
