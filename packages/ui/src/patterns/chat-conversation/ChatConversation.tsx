import { ArrowDownIcon } from "@heroicons/react/24/outline";
import {
  Children,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useMergedRefs } from "../../hooks/useMergedRefs";
import { prefersReducedMotion } from "../../lib/motion";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";

export interface ChatConversationLabels {
  /** Accessible name of the message log. */
  conversation: string;
  jumpToLatest: string;
  loadingHistory: string;
}

export const defaultChatConversationLabels: ChatConversationLabels = {
  conversation: "Conversation",
  jumpToLatest: "Jump to latest",
  loadingHistory: "Loading earlier messages…",
};

export interface ChatConversationProps extends Omit<HTMLAttributes<HTMLDivElement>, "onScroll"> {
  /** The messages (`ChatMessage`s, tool cards…). */
  children?: ReactNode;
  /** Shown instead of the log content while there are no children (a hero, starter suggestions…). */
  empty?: ReactNode;
  /** Follow new content while the user is at the bottom. Default `true`. */
  stickToBottom?: boolean;
  /** Changing this value scrolls to the latest message and re-attaches (pass the id of the last message you sent). */
  followKey?: unknown;
  /** Fires once each time the user scrolls to the top: load the previous page of history. */
  onReachTop?: () => void;
  /** Shows a spinner row at the top while a history page loads. */
  loadingHistory?: boolean;
  /** Class names for the padded column inside the scroller. Default `flex flex-col gap-4 p-4`. */
  contentClassName?: string;
  labels?: Partial<ChatConversationLabels>;
}

/** Within this many px of the bottom counts as "at the bottom". */
const BOTTOM_THRESHOLD = 24;
const TOP_THRESHOLD = 48;

/**
 * Scrolling message list: sticks to the bottom while new content arrives (streaming
 * tokens grow the last message), stops following as soon as the user scrolls up and
 * offers a "Jump to latest" button, reports the top for history paging. `role="log"`
 * with polite live-region semantics, focusable so keyboard users can scroll it.
 * Pair with `ChatMessage` and `PromptInput`. The `ref` is the scroll container.
 */
export const ChatConversation = forwardRef<HTMLDivElement, ChatConversationProps>(
  (
    {
      children,
      empty,
      stickToBottom = true,
      followKey,
      onReachTop,
      loadingHistory = false,
      contentClassName,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultChatConversationLabels, ...labels };
    const scroller = useRef<HTMLDivElement>(null);
    const content = useRef<HTMLDivElement>(null);
    const merged = useMergedRefs(scroller, ref);
    const stuck = useRef(stickToBottom);
    const atTop = useRef(false);
    const reachTop = useRef(onReachTop);
    reachTop.current = onReachTop;
    const [away, setAway] = useState(false);
    const isEmpty = Children.toArray(children).length === 0;

    const toBottom = useCallback((smooth: boolean) => {
      const el = scroller.current;
      if (!el) return;
      if (smooth && typeof el.scrollTo === "function") {
        el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }, []);

    const onScroll = useCallback(() => {
      const el = scroller.current;
      if (!el) return;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const bottom = distance <= BOTTOM_THRESHOLD;
      stuck.current = bottom;
      setAway(!bottom);
      const top = el.scrollTop <= TOP_THRESHOLD && el.scrollHeight > el.clientHeight;
      if (top && !atTop.current) reachTop.current?.();
      atTop.current = top;
    }, []);

    // Start at the latest message.
    useLayoutEffect(() => {
      if (stickToBottom) toBottom(false);
    }, [stickToBottom, toBottom]);

    // Follow growth (new messages, streamed tokens, images) while attached.
    useEffect(() => {
      const el = content.current;
      if (!el || typeof ResizeObserver === "undefined") return undefined;
      const observer = new ResizeObserver(() => {
        if (stickToBottom && stuck.current) toBottom(false);
        else onScroll();
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [stickToBottom, toBottom, onScroll]);

    const first = useRef(true);
    useLayoutEffect(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      stuck.current = true;
      setAway(false);
      toBottom(false);
    }, [followKey, toBottom]);

    return (
      <div className={cn("relative flex min-h-0 flex-1 flex-col", className)} {...props}>
        <div
          ref={merged}
          role="log"
          aria-label={l.conversation}
          aria-live="polite"
          aria-relevant="additions text"
          tabIndex={0}
          onScroll={onScroll}
          data-slot="chat-conversation-scroller"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <div ref={content} className={cn("flex min-h-full flex-col gap-4 p-4", contentClassName)}>
            {loadingHistory ? (
              <LoadingSpinner size="sm" label={l.loadingHistory} className="mx-auto text-xs text-muted-foreground" />
            ) : null}
            {isEmpty ? <div className="m-auto w-full">{empty}</div> : children}
          </div>
        </div>
        {away && !isEmpty ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              stuck.current = true;
              toBottom(true);
            }}
            className={cn(
              "absolute bottom-3 left-1/2 h-8 -translate-x-1/2 rounded-[var(--radius-pill,9999px)] border-foreground/20 bg-background px-3 shadow-md dark:border-border",
              "transition-[opacity,translate] duration-150 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0",
            )}
          >
            <ArrowDownIcon aria-hidden="true" />
            {l.jumpToLatest}
          </Button>
        ) : null}
      </div>
    );
  },
);
ChatConversation.displayName = "ChatConversation";
