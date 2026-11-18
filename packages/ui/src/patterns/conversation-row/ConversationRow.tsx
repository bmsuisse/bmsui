import { PaperClipIcon, StarIcon } from "@heroicons/react/16/solid";
import { type HTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "../../lib/utils";
import { Checkbox } from "../../primitives/checkbox";
import { Avatar } from "../avatar/Avatar";
import { StatusDot } from "../status-dot/StatusDot";
import type { StatusTone } from "../status-badge/StatusBadge";
import { Timestamp } from "../timestamp/Timestamp";

export type ConversationStatus = "active" | "pending" | "closed" | "spam";

export interface ConversationPerson {
  name: string;
  avatarSrc?: string;
}

export interface ConversationRowLabels {
  status: Record<ConversationStatus, string>;
  unread: string;
  starred: string;
  attachments: string;
  /** Accessible name of the thread-count pill. */
  threads: (count: number) => string;
  /** Accessible name of the selection checkbox. */
  select: (subject: string) => string;
  assignedTo: (name: string) => string;
  noSubject: string;
}

export const defaultConversationRowLabels: ConversationRowLabels = {
  status: { active: "Active", pending: "Pending", closed: "Closed", spam: "Spam" },
  unread: "Unread",
  starred: "Starred",
  attachments: "Has attachments",
  threads: (count) => `${count} ${count === 1 ? "message" : "messages"}`,
  select: (subject) => `Select ${subject}`,
  assignedTo: (name) => `Assigned to ${name}`,
  noSubject: "(no subject)",
};

const STATUS_TONE: Record<ConversationStatus, StatusTone> = {
  active: "success",
  pending: "warning",
  closed: "neutral",
  spam: "error",
};

export interface ConversationRowProps extends Omit<HTMLAttributes<HTMLLIElement>, "children" | "onClick"> {
  subject: string;
  preview?: string;
  customer: ConversationPerson;
  assignee?: ConversationPerson;
  status?: ConversationStatus;
  unread?: boolean;
  starred?: boolean;
  threadCount?: number;
  hasAttachments?: boolean;
  time: Date | string | number;
  /** Tags/labels; they stay separately clickable. */
  tags?: ReactNode;
  /** Shows a checkbox when `onSelectedChange` is given. */
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Makes the row a link. */
  href?: string;
  /** Makes the row a button (or runs on a link click). */
  onClick?: () => void;
  timeLocale?: string;
  labels?: Partial<Omit<ConversationRowLabels, "status">> & { status?: Partial<ConversationRowLabels["status"]> };
  "data-testid"?: string;
}

/**
 * One inbox row: customer, subject - preview, status/star/attachment icons, assignee and time.
 * The whole row is one link/button through a stretched overlay, the checkbox and `tags` sit above
 * it and stay clickable on their own (like `ResultCard`). Renders an `<li>`: put rows in a
 * `ConversationList`. Below `sm` it wraps: customer + time on the first line, then subject/preview, then status/icons/assignee.
 */
export const ConversationRow = forwardRef<HTMLLIElement, ConversationRowProps>(
  (
    {
      subject,
      preview,
      customer,
      assignee,
      status,
      unread = false,
      starred = false,
      threadCount,
      hasAttachments = false,
      time,
      tags,
      selected = false,
      onSelectedChange,
      href,
      onClick,
      timeLocale,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultConversationRowLabels, ...labels, status: { ...defaultConversationRowLabels.status, ...labels?.status } };
    const title = subject || l.noSubject;
    const main = (
      <>
        <span className={cn("[overflow-wrap:anywhere]", unread ? "font-semibold text-foreground" : "text-foreground")}>{title}</span>
        {preview ? <span className="text-muted-foreground [overflow-wrap:anywhere]"> – {preview}</span> : null}
      </>
    );
    const stretch =
      "min-w-0 rounded-sm text-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring";
    return (
      <li
        ref={ref}
        data-unread={unread || undefined}
        data-selected={selected || undefined}
        className={cn(
          "relative flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 transition-colors sm:flex-nowrap",
          (href || onClick) && "hover:bg-foreground/[0.04]",
          selected && "bg-primary/10 dark:bg-ring/15",
          className,
        )}
        {...props}
      >
        {onSelectedChange ? (
          <Checkbox
            checked={selected}
            onCheckedChange={(next) => onSelectedChange(next === true)}
            aria-label={l.select(title)}
            className="relative z-10 shrink-0 pointer-coarse:size-5"
          />
        ) : null}
        <div className="order-1 flex min-w-0 flex-1 items-center gap-2 text-sm sm:order-none sm:w-44 sm:flex-none">
          {/* The dot's width is reserved in every row so customer names line up. */}
          <span aria-hidden={unread ? undefined : true} className={cn("size-2 shrink-0 rounded-full", unread ? "bg-primary dark:bg-ring" : "bg-transparent")}>
            {unread ? <span className="sr-only">{l.unread}</span> : null}
          </span>
          <span title={customer.name} className={cn("min-w-0 [overflow-wrap:anywhere] sm:line-clamp-1", unread && "font-semibold")}>
            {customer.name}
          </span>
        </div>
        <div className="order-3 flex min-w-0 basis-full flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:order-none sm:basis-0 sm:flex-1">
          {href ? (
            <a href={href} onClick={onClick} className={stretch}>
              {main}
            </a>
          ) : onClick ? (
            <button type="button" onClick={onClick} className={cn(stretch, "text-left")}>
              {main}
            </button>
          ) : (
            <span className="min-w-0 text-sm">{main}</span>
          )}
          {tags ? <span className="relative z-10 flex flex-wrap items-center gap-1">{tags}</span> : null}
        </div>
        <div className="order-4 flex shrink-0 items-center gap-2 text-muted-foreground sm:order-none">
          {status ? (
            <StatusDot tone={STATUS_TONE[status]} label={l.status[status]} className="text-xs" />
          ) : null}
          {starred ? (
            <span className="inline-flex text-amber-600 dark:text-amber-400">
              <StarIcon aria-hidden="true" className="size-4" />
              <span className="sr-only">{l.starred}</span>
            </span>
          ) : null}
          {hasAttachments ? (
            <span className="inline-flex">
              <PaperClipIcon aria-hidden="true" className="size-4" />
              <span className="sr-only">{l.attachments}</span>
            </span>
          ) : null}
          {threadCount !== undefined && threadCount > 1 ? (
            <span
              aria-label={l.threads(threadCount)}
              className="inline-flex min-w-5 items-center justify-center rounded-[var(--radius-pill,9999px)] bg-muted px-1.5 text-[11px] font-medium text-muted-foreground"
            >
              {threadCount}
            </span>
          ) : null}
        </div>
        {assignee ? (
          <Avatar className="order-4 sm:order-none" name={assignee.name} src={assignee.avatarSrc} size="xs" title={l.assignedTo(assignee.name)} />
        ) : null}
        <Timestamp value={time} locale={timeLocale} className="order-2 shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:order-none" />
      </li>
    );
  },
);
ConversationRow.displayName = "ConversationRow";

export type ConversationListProps = HTMLAttributes<HTMLUListElement>;

/** `<ul>` for `ConversationRow`s with hairline dividers. Give it an `aria-label`. */
export const ConversationList = forwardRef<HTMLUListElement, ConversationListProps>(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn("m-0 list-none divide-y divide-foreground/10 p-0 dark:divide-border", className)} {...props} />
));
ConversationList.displayName = "ConversationList";
