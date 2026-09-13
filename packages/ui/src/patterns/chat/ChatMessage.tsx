import { forwardRef } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Skeleton } from "../../primitives/skeleton";
import { AiMarker } from "../ai/AiMarker";

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessageProps extends HTMLAttributes<HTMLDivElement> {
  /** Only these two roles exist — no system/tool message rendering. */
  role: ChatMessageRole;
  /** Rendered text/parts. Markdown rendering is the consumer's job. */
  children: ReactNode;
  /** Footer slot (copy, regenerate, feedback…), a fixed-height row. */
  actions?: ReactNode;
  /** Above the body: attachments (user) or an AiMarker / model label (assistant). */
  leading?: ReactNode;
  /** Inline error box under the body; same shape for both roles. */
  error?: ReactNode;
  /**
   * Assistant only: prefix the body with an AiMarker. `true` renders
   * `<AiMarker size="xs" variant="inline" />`; a node replaces it.
   * @default false
   */
  marker?: boolean | ReactNode;
  /** @default "comfortable" */
  density?: "comfortable" | "compact";
  /** Cap for the user bubble; assistant prose is always full width. @default "85%" */
  maxBubbleWidth?: string;
  testId?: string;
}

/**
 * A single turn in an assistant-ui-driven thread. This component is
 * deliberately dumb: the consuming app owns the runtime (message list,
 * streaming, retry, branch switching) and hands this a `render={<ChatMessage
 * role="..."/>}` target per message — so there is no internal state, no data
 * fetching, and every prop is either content or a slot. `forwardRef` + spread
 * `...props` exist because assistant-ui composes its own event handlers and
 * DOM refs onto whatever the render target returns.
 *
 * **The user/assistant asymmetry is the single most important decision
 * here.** A user turn is a quoted utterance — short, one of possibly many
 * inputs, so it gets a right-aligned `bg-muted` bubble capped at
 * `maxBubbleWidth` to read as "a thing that was said." An assistant turn is
 * not a quoted reply at all — it *is* the page content the user came for
 * (an explanation, a table, a block of prose), so it renders as full-width
 * `px-2` prose with no bubble and no avatar column. Giving the assistant
 * turn a bubble (as most chat-UI tutorials do) would visually subordinate
 * the answer to the question, and it would also force markdown content
 * (tables, code blocks, long paragraphs) into an artificially narrow,
 * padded box that fights its own line length. Avatars are dropped
 * altogether on both sides: the role is already legible from alignment and
 * chrome, and a real assistant-ui deployment renders many turns in a row
 * with nothing else, where a repeated avatar column is just wasted width in
 * exactly the situation (long threads, narrow sidebars) that matters most.
 *
 * **`actions` reserves its height even when the runtime hides it.**
 * assistant-ui typically only shows the actions row (copy/regenerate/
 * feedback) on the last message or on hover, but if the row's height
 * collapses to zero when empty, every earlier message reflows the moment a
 * new one is appended — a visible jump in a scroll region the user is
 * mid-read in. `min-h-7.5` (30px) keeps the row's footprint stable
 * regardless of what the runtime currently shows there; the row still only
 * renders when `actions` is provided at all; a message that structurally
 * never has actions (a pure history replay) doesn't pay for the space.
 *
 * **No `aria-live` on the root.** assistant-ui's own scroll viewport already
 * owns live-region announcements for the thread; a second live region here
 * would double-announce streaming tokens. `data-role` is the intentional
 * substitute — a plain data hook tests and consumer CSS can use to tell
 * roles apart without reaching for fragile class-name matching.
 *
 * **`marker` is opt-in and assistant-only** because not every consumer wants
 * a provenance glyph on every single turn (a dedicated "AI" model label in
 * the surrounding chrome can already cover it); when used, it reuses
 * `AiMarker` rather than inventing a second "this came from a model" glyph.
 *
 * **`content-visibility:auto`** is here because assistant-ui threads are
 * frequently hundreds of turns deep once history loads; without it the
 * browser lays out and paints every off-screen message on each new token.
 * `contain-intrinsic-size` gives it a sane guess (200px) so scrollbar
 * position doesn't jump as messages above the fold get their real size
 * back.
 *
 * **Not built here:** system/tool-role rendering, an avatar, a branch
 * picker, an edit-in-place composer, timestamps/read receipts, markdown
 * rendering. Those are either the consuming app's job (assistant-ui already
 * has primitives for branch/composer) or simply out of scope for a single
 * message row.
 */
export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(
  (
    {
      role,
      children,
      actions,
      leading,
      error,
      marker = false,
      density = "comfortable",
      maxBubbleWidth = "85%",
      testId,
      className,
      ...props
    },
    ref,
  ): ReactElement => {
    const isUser = role === "user";
    const compact = density === "compact";
    const markerNode =
      !isUser && marker ? (marker === true ? <AiMarker size="xs" variant="inline" /> : marker) : null;

    return (
      <div
        ref={ref}
        data-slot="chat-message"
        data-role={role}
        data-testid={testId}
        className={cn(
          "flex w-full flex-col [content-visibility:auto] [contain-intrinsic-size:auto_200px]",
          isUser ? "items-end" : "items-start",
          compact ? "gap-1" : "gap-1.5",
          className,
        )}
        {...props}
      >
        {leading != null && (
          <div data-slot="chat-message-leading" className={cn(isUser && "flex justify-end")}>
            {leading}
          </div>
        )}

        {isUser ? (
          <div
            data-slot="chat-message-bubble"
            style={{ maxWidth: maxBubbleWidth }}
            className={cn("rounded-xl bg-muted px-4", compact ? "py-1.5" : "py-2")}
          >
            {children}
          </div>
        ) : (
          <div
            data-slot="chat-message-body"
            className={cn("w-full px-2 leading-relaxed", compact ? "space-y-1" : "space-y-2")}
          >
            {markerNode && <div data-slot="chat-message-marker">{markerNode}</div>}
            {children}
          </div>
        )}

        {error != null && (
          <div
            role="alert"
            data-slot="chat-message-error"
            className="mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm"
          >
            {error}
          </div>
        )}

        {actions != null && (
          <div
            data-slot="chat-message-actions"
            className={cn("flex min-h-7.5 items-center gap-1", isUser ? "justify-end" : "justify-start")}
          >
            {actions}
          </div>
        )}
      </div>
    );
  },
);
ChatMessage.displayName = "ChatMessage";

export interface ChatMessageSkeletonProps {
  /** @default 3 */
  turns?: number;
  className?: string;
}

/**
 * History-loading placeholder: alternating right-aligned bubble / left-
 * aligned text lines, standing in for a user turn followed by an assistant
 * turn while assistant-ui's thread history is still being fetched. It
 * intentionally mirrors `ChatMessage`'s own asymmetry (a bubble on the
 * right, bare lines on the left) so the loading state doesn't visually
 * "pop" into a differently-shaped layout once real messages arrive.
 */
export function ChatMessageSkeleton({ turns = 3, className }: ChatMessageSkeletonProps): ReactElement {
  return (
    <div
      role="status"
      aria-label="Loading conversation"
      data-slot="chat-message-skeleton"
      className={cn("flex w-full flex-col gap-4", className)}
    >
      {Array.from({ length: turns }, (_, i) => (
        <div key={i} data-slot="chat-message-skeleton-turn" className="flex flex-col gap-3">
          <Skeleton className="ml-auto h-9 w-2/5 rounded-xl motion-reduce:animate-none" />
          <div className="flex flex-col gap-2 px-2">
            <Skeleton className="h-4 w-full motion-reduce:animate-none" />
            <Skeleton className="h-4 w-11/12 motion-reduce:animate-none" />
            <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
