import { type HTMLAttributes, type ReactNode, forwardRef } from "react";
import { type ErrorInput } from "../../lib/errorState";
import { cn } from "../../lib/utils";
import { Avatar } from "../avatar/Avatar";
import { InlineError } from "../error-state/ErrorState";
import { Timestamp } from "../timestamp/Timestamp";

export type ChatRole = "user" | "assistant" | "system";
export type ChatMessageStatus = "sending" | "streaming" | "error" | "done";

export interface ChatMessageLabels {
  /** Shown while `status="sending"`. */
  sending: string;
  /** Screen-reader text while `status="streaming"`. */
  streaming: string;
  /** Error text when `status="error"` and no `error` prop is given. */
  failed: string;
  retry: string;
  /** Accessible name of the message, `{name}` is the sender. */
  roleUser: string;
  roleAssistant: string;
  roleSystem: string;
}

export const defaultChatMessageLabels: ChatMessageLabels = {
  sending: "Sending…",
  streaming: "Writing a reply",
  failed: "This message could not be sent.",
  retry: "Retry",
  roleUser: "You",
  roleAssistant: "Assistant",
  roleSystem: "System",
};

export interface ChatMessageProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  role: ChatRole;
  /** Sender name. Defaults to the role's label; shown above the content (assistant) and as the avatar's name. */
  name?: string;
  /** Picture slot. `true` renders an `Avatar` from `name`; pass your own node to override. Hidden for user and system messages unless given. */
  avatar?: ReactNode | boolean;
  /** Date, ISO string or epoch ms (rendered with `Timestamp`), or any node. */
  time?: Date | string | number | ReactNode;
  /** `sending` shows a "Sending…" caption, `streaming` shows a live caret and sets `aria-busy`, `error` shows the error line with Retry. */
  status?: ChatMessageStatus;
  /** Error shown for `status="error"`; defaults to `labels.failed`. */
  error?: ErrorInput;
  onRetry?: () => void;
  /** Buttons under the content (copy, retry, feedback…); revealed on hover/focus on pointer devices, always visible on touch. */
  actions?: ReactNode;
  labels?: Partial<ChatMessageLabels>;
  /** The message content. Pass already-rendered nodes (text, markdown, tool cards). */
  children?: ReactNode;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/** A Date, epoch ms or ISO string becomes a `Timestamp`; any other node ("Just now") is shown as given. */
function isTime(value: unknown): value is Date | string | number {
  if (typeof value === "string") return ISO_DAY.test(value) && !Number.isNaN(Date.parse(value));
  return value instanceof Date || typeof value === "number";
}

/**
 * One chat turn. The user's message is a right-aligned bubble; the assistant's is plain
 * text on the page with an optional avatar and name (so long answers and rich content read
 * as a document, not a bubble); system messages are a centered muted note. Data in, no
 * state: streaming text and retry are the caller's. Long words and URLs wrap; wide content
 * (tables, code) scrolls inside the message.
 */
export const ChatMessage = forwardRef<HTMLElement, ChatMessageProps>(
  (
    { role, name, avatar, time, status = "done", error, onRetry, actions, labels, className, children, ...props },
    ref,
  ) => {
    const l = { ...defaultChatMessageLabels, ...labels };
    const roleLabel = role === "user" ? l.roleUser : role === "assistant" ? l.roleAssistant : l.roleSystem;
    const sender = name ?? roleLabel;
    const user = role === "user";
    const system = role === "system";
    const streaming = status === "streaming";
    const avatarNode = avatar === true ? <Avatar name={sender} size="md" /> : avatar === false ? null : avatar;
    const timeNode = isTime(time) ? <Timestamp value={time} format="time" tooltip={false} /> : time;

    if (system) {
      return (
        <article
          ref={ref}
          data-role="system"
          data-status={status}
          aria-label={sender}
          className={cn("mx-auto max-w-prose px-4 text-center text-xs text-muted-foreground [overflow-wrap:anywhere]", className)}
          {...props}
        >
          {children}
        </article>
      );
    }

    return (
      <article
        ref={ref}
        data-role={role}
        data-status={status}
        aria-label={sender}
        aria-busy={streaming || undefined}
        className={cn("group/message flex min-w-0 gap-3", user ? "flex-row-reverse" : "flex-row", className)}
        {...props}
      >
        {avatarNode ? <div className="mt-0.5 shrink-0">{avatarNode}</div> : null}
        <div className={cn("flex min-w-0 max-w-full flex-1 flex-col gap-1", user ? "items-end" : "items-start")}>
          {(!user && name) || timeNode ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {!user && name ? <span className="font-medium text-foreground">{name}</span> : null}
              {timeNode ? <span className="tabular-nums">{timeNode}</span> : null}
            </div>
          ) : null}
          <div
            className={cn(
              "min-w-0 max-w-full text-sm leading-6 [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto",
              user
                ? "whitespace-pre-wrap rounded-2xl bg-primary px-3.5 py-2 text-primary-foreground sm:max-w-[85%]"
                : "w-full text-foreground",
              status === "error" && user && "ring-2 ring-red-700 ring-offset-1 ring-offset-background dark:ring-red-300",
            )}
          >
            {children}
            {streaming ? (
              <>
                <span
                  aria-hidden="true"
                  className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-sm bg-foreground/60 animate-pulse motion-reduce:animate-none"
                />
                <span className="sr-only">{l.streaming}</span>
              </>
            ) : null}
          </div>
          {status === "sending" ? <span className="text-xs text-muted-foreground">{l.sending}</span> : null}
          {status === "error" ? (
            <InlineError
              wrap
              error={error ?? l.failed}
              onRetry={onRetry}
              labels={{ retry: l.retry }}
              retryProps={{ className: "min-h-8 px-1" }}
            />
          ) : null}
          {actions ? (
            <div
              className={cn(
                "flex items-center gap-1 text-muted-foreground transition-opacity duration-150 ease-out",
                "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/message:opacity-100 [@media(hover:hover)]:group-focus-within/message:opacity-100",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </article>
    );
  },
);
ChatMessage.displayName = "ChatMessage";
