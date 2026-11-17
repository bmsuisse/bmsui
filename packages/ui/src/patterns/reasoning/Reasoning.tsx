import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { LightBulbIcon } from "@heroicons/react/24/outline";
import { type HTMLAttributes, type ReactNode, forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { FoldPanel } from "../../lib/FoldPanel";
import { SCROLL_FOCUS_WRAPPER, SCROLL_REGION, useScrollFade } from "../../lib/scrollFade";
import { SHIMMER_CLASSES, useShimmer } from "../../lib/useShimmer";
import { cn } from "../../lib/utils";
import { Collapsible, CollapsibleTrigger } from "../../primitives/collapsible";

export interface ReasoningLabels {
  /** Header while `streaming`. */
  thinking: string;
  /** Header when done and the duration is known ("Thought for 4 s"). */
  thoughtFor: (seconds: number) => string;
  /** Header when done and the duration is unknown. */
  thought: string;
}

export const defaultReasoningLabels: ReasoningLabels = {
  thinking: "Thinking…",
  thoughtFor: (seconds) => `Thought for ${seconds} s`,
  thought: "Reasoning",
};

export interface ReasoningProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The model's reasoning text (or any node, e.g. rendered markdown). */
  children: ReactNode;
  /** Still being produced: header shimmers, panel is open and follows the newest text. */
  streaming?: boolean;
  /** Seconds the model thought, for "Thought for 4 s". */
  duration?: number;
  /** Open at rest (after streaming ends). Uncontrolled. The first manual toggle takes over for good. @default false */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Cap for the scrolling text, px or CSS length. @default 256 */
  maxHeight?: number | string;
  labels?: Partial<ReasoningLabels>;
}

/**
 * The collapsible "thinking" block of an assistant message. While `streaming` it is open, its
 * header shimmers and the text stays pinned to the newest line (unless the reader scrolls up);
 * once done it folds to one quiet line "Thought for 4 s" that opens on demand.
 */
export const Reasoning = forwardRef<HTMLDivElement, ReasoningProps>(
  (
    { children, streaming = false, duration, defaultOpen = false, open: openProp, onOpenChange, maxHeight = 256, labels, className, ...props },
    ref,
  ) => {
    const l = { ...defaultReasoningLabels, ...labels };
    const [userOpen, setUserOpen] = useState<boolean | null>(null);
    const open = openProp ?? userOpen ?? (streaming || defaultOpen);
    const label = streaming ? l.thinking : duration != null ? l.thoughtFor(duration) : l.thought;
    const shimmer = useShimmer<HTMLSpanElement>(streaming);

    // Follow the newest text while streaming; stop following once the reader scrolls up.
    const scroller = useRef<HTMLDivElement | null>(null);
    const fade = useScrollFade<HTMLDivElement>();
    const fadeRef = fade.ref;
    const setScroller = useCallback(
      (node: HTMLDivElement | null) => {
        scroller.current = node;
        fadeRef(node);
      },
      [fadeRef],
    );
    const inner = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const scrollEl = scroller.current;
      const innerEl = inner.current;
      if (!streaming || !open || !scrollEl || !innerEl) return;
      let pinned = true;
      let lastTop = scrollEl.scrollTop;
      let lastHeight = scrollEl.scrollHeight;
      const atBottom = (): boolean => scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight <= 1;
      const pin = (): void => {
        if (pinned) scrollEl.scrollTop = scrollEl.scrollHeight;
      };
      const onScroll = (): void => {
        // Only an upward move at unchanged height is user intent; growth also fires scroll events.
        if (atBottom()) pinned = true;
        else if (scrollEl.scrollTop < lastTop && scrollEl.scrollHeight === lastHeight) pinned = false;
        lastTop = scrollEl.scrollTop;
        lastHeight = scrollEl.scrollHeight;
      };
      pin();
      scrollEl.addEventListener("scroll", onScroll);
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(pin) : null;
      observer?.observe(innerEl);
      return () => {
        scrollEl.removeEventListener("scroll", onScroll);
        observer?.disconnect();
      };
    }, [streaming, open]);

    return (
      <Collapsible
        ref={ref}
        open={open}
        onOpenChange={(next) => {
          if (openProp === undefined) setUserOpen(next);
          onOpenChange?.(next);
        }}
        data-slot="reasoning"
        data-streaming={streaming || undefined}
        className={cn("min-w-0 max-w-full", className)}
        {...props}
      >
        <CollapsibleTrigger className="group/rs -mx-1 flex min-h-8 max-w-full items-center gap-2 rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
          <LightBulbIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span ref={shimmer} className={cn("min-w-0 truncate tabular-nums", SHIMMER_CLASSES)}>
            {label}
          </span>
          <ChevronRightIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 transition-[rotate] duration-200 ease-out group-data-[state=open]/rs:rotate-90 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
        <FoldPanel open={open}>
          <div className={cn("ml-[7px]", SCROLL_FOCUS_WRAPPER)}>
            <div
              ref={setScroller}
              tabIndex={open ? 0 : -1}
              role="region"
              aria-label={label}
              style={{ maxHeight, ...fade.style }}
              aria-busy={streaming || undefined}
              className={cn(
                "overflow-y-auto border-l border-foreground/10 pl-4 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere] dark:border-border",
                SCROLL_REGION,
              )}
            >
              <div ref={inner} className="space-y-3 py-1.5">
                {children}
              </div>
            </div>
          </div>
        </FoldPanel>
      </Collapsible>
    );
  },
);
Reasoning.displayName = "Reasoning";
