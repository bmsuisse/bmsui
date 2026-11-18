import { type HTMLAttributes, type ReactNode, forwardRef, useState } from "react";
import { cn } from "../../lib/utils";
import { type AttachmentItem, AttachmentList, type AttachmentListLabels } from "../attachment-list/AttachmentList";
import { Avatar } from "../avatar/Avatar";
import { QuotedText, type QuotedTextLabels } from "../quoted-text/QuotedText";
import { Timestamp } from "../timestamp/Timestamp";

export type MailDirection = "inbound" | "outbound" | "note";
export type MailMessageStatus = "sent" | "sending" | "failed" | "bounced" | "draft";

export interface MailRecipients {
  to?: string[];
  cc?: string[];
  bcc?: string[];
}

export interface MailSender {
  name: string;
  email?: string;
  avatarSrc?: string;
}

export interface MailMessageLabels {
  to: string;
  cc: string;
  bcc: string;
  showRecipients: string;
  hideRecipients: string;
  draft: string;
  sending: string;
  failed: string;
  bounced: string;
  retry: string;
  note: string;
  attachments: Partial<AttachmentListLabels>;
  quoted: Partial<QuotedTextLabels>;
}

export const defaultMailMessageLabels: MailMessageLabels = {
  to: "to",
  cc: "cc",
  bcc: "bcc",
  showRecipients: "Show all recipients",
  hideRecipients: "Hide recipients",
  draft: "[Draft]",
  sending: "Sending…",
  failed: "Sending failed",
  bounced: "Bounced",
  retry: "Retry",
  note: "Note",
  attachments: {},
  quoted: {},
};

export interface MailMessageProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  direction: MailDirection;
  sender: MailSender;
  recipients?: MailRecipients;
  /** Date, ISO string or epoch ms. */
  time: Date | string | number;
  subject?: string;
  status?: MailMessageStatus;
  onRetry?: () => void;
  /** Failure detail shown for `failed`/`bounced`. */
  error?: string;
  /** Badges next to the sender (e.g. `StatusBadge`, `Chip`). */
  badges?: ReactNode;
  attachments?: AttachmentItem[];
  /** Quoted reply history, rendered folded inside `QuotedText`. */
  quoted?: ReactNode;
  /** Buttons under the body (Reply, Forward). */
  actions?: ReactNode;
  labels?: Partial<MailMessageLabels>;
  /** The body. Pass already-sanitized React nodes; nothing is injected here. */
  children?: ReactNode;
}

const COLLAPSE_AFTER = 3;

/** One entry of a mail thread: avatar, sender, recipients line, time, body, attachments, folded quote and actions. */
export const MailMessage = forwardRef<HTMLElement, MailMessageProps>(
  (
    {
      direction,
      sender,
      recipients,
      time,
      subject,
      status = "sent",
      onRetry,
      error,
      badges,
      attachments,
      quoted,
      actions,
      labels,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultMailMessageLabels, ...labels };
    const [allRecipients, setAllRecipients] = useState(false);
    const groups = (["to", "cc", "bcc"] as const)
      .map((k) => ({ key: k, label: l[k], list: recipients?.[k] ?? [] }))
      .filter((g) => g.list.length > 0);
    const total = groups.reduce((n, g) => n + g.list.length, 0);
    const long = total > COLLAPSE_AFTER;
    const failed = status === "failed" || status === "bounced";
    const note = direction === "note";
    return (
      <article
        ref={ref}
        data-direction={direction}
        data-status={status}
        aria-label={sender.name}
        aria-busy={status === "sending" || undefined}
        className={cn(
          "flex min-w-0 gap-3 rounded-lg border p-3 sm:p-4",
          note
            ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
            : cn("border-foreground/10 dark:border-border", direction === "outbound" ? "bg-foreground/[0.03]" : "bg-background"),
          className,
        )}
        {...props}
      >
        <Avatar name={sender.name} src={sender.avatarSrc} size="md" decorative className="mt-0.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <header className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-foreground [overflow-wrap:anywhere]">{sender.name}</span>
              {sender.email ? (
                <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">&lt;{sender.email}&gt;</span>
              ) : null}
              {note ? <span className="text-xs font-medium text-amber-800 dark:text-amber-300">{l.note}</span> : null}
              {status === "draft" ? <span className="text-xs font-medium text-muted-foreground">{l.draft}</span> : null}
              {status === "sending" ? <span className="text-xs text-muted-foreground">{l.sending}</span> : null}
              {badges}
              <Timestamp
                value={time}
                format="datetime"
                tooltip={false}
                live={false}
                className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
              />
            </div>
            {groups.length > 0 ? (
              <div className="flex min-w-0 items-start gap-1 text-xs text-muted-foreground">
                <p className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", long && !allRecipients && "line-clamp-1")}>
                  {groups.map((g, i) => (
                    <span key={g.key}>
                      {i > 0 ? " · " : ""}
                      {g.label}: {g.list.join(", ")}
                    </span>
                  ))}
                </p>
                {long ? (
                  <button
                    type="button"
                    aria-expanded={allRecipients}
                    onClick={() => setAllRecipients((v) => !v)}
                    className="shrink-0 rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    {allRecipients ? l.hideRecipients : l.showRecipients}
                  </button>
                ) : null}
              </div>
            ) : null}
          </header>
          {subject ? <h3 className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{subject}</h3> : null}
          <div className="min-w-0 max-w-full text-sm leading-6 [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto">
            {children}
          </div>
          {failed ? (
            <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <span className="[overflow-wrap:anywhere]">
                {status === "bounced" ? l.bounced : l.failed}
                {error ? `: ${error}` : ""}
              </span>
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-sm underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 pointer-coarse:min-h-8"
                >
                  {l.retry}
                </button>
              ) : null}
            </div>
          ) : null}
          {attachments && attachments.length > 0 ? <AttachmentList attachments={attachments} labels={l.attachments} /> : null}
          {quoted ? <QuotedText labels={l.quoted}>{quoted}</QuotedText> : null}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </article>
    );
  },
);
MailMessage.displayName = "MailMessage";
