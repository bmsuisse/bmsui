import type { TextareaHTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useLayoutEffect as useReactLayoutEffect, useRef } from "react";
import { useMergedRefs } from "../hooks/useMergedRefs";
import { cn } from "../lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with the content instead of scrolling (and hide the manual resize grip). Default `false`. */
  autoResize?: boolean;
  /** With `autoResize`: stop growing after this many lines and scroll instead. Default: no limit. */
  maxRows?: number;
}

/** Fits `el` to its content, capped at `maxRows` lines. */
function fit(el: HTMLTextAreaElement, maxRows: number | undefined) {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  el.style.height = "auto";
  const borders = el.offsetHeight - el.clientHeight;
  let height = el.scrollHeight + borders;
  let capped = false;
  const lineHeight = style ? Number.parseFloat(style.lineHeight) : Number.NaN;
  if (maxRows && Number.isFinite(lineHeight) && style) {
    const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    const max = lineHeight * maxRows + padding + borders;
    if (height > max) {
      height = max;
      capped = true;
    }
  }
  el.style.height = `${height}px`;
  el.style.overflowY = capped ? "auto" : "hidden";
}

// `useLayoutEffect` warns during server rendering in React 18.
const useLayoutEffect = typeof window === "undefined" ? useEffect : useReactLayoutEffect;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = false, maxRows, onInput, rows, ...props }, ref) => {
    const inner = useRef<HTMLTextAreaElement>(null);
    const merged = useMergedRefs(inner, ref);
    const resize = useCallback(() => {
      if (autoResize && inner.current) fit(inner.current, maxRows);
    }, [autoResize, maxRows]);
    // Runs after every render: covers controlled value changes, `defaultValue`, and a changed `maxRows`.
    useLayoutEffect(() => {
      if (autoResize) resize();
    });
    useLayoutEffect(() => {
      const el = inner.current;
      if (!autoResize || !el || typeof ResizeObserver === "undefined") return undefined;
      // Width changes re-wrap the text, which changes the height it needs.
      let width = el.clientWidth;
      const observer = new ResizeObserver(() => {
        if (el.clientWidth !== width) {
          width = el.clientWidth;
          fit(el, maxRows);
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [autoResize, maxRows]);
    return (
      <textarea
        className={cn(
          "flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive disabled:cursor-not-allowed disabled:opacity-50",
          autoResize && "resize-none",
          className,
        )}
        ref={merged}
        rows={rows ?? (autoResize ? 1 : undefined)}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
