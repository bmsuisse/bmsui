import { type ElementType, type HTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "../../lib/utils";
import { Timestamp } from "../timestamp/Timestamp";

export type MailEventTone = "neutral" | "success" | "warning" | "danger";

const TONE: Record<MailEventTone, string> = {
  neutral: "text-muted-foreground",
  success: "text-emerald-800 dark:text-emerald-300",
  warning: "text-amber-800 dark:text-amber-300",
  danger: "text-red-700 dark:text-red-300",
};

export interface MailEventProps extends Omit<HTMLAttributes<HTMLLIElement>, "children"> {
  /** The event text ("Anna assigned this to Bob"). */
  children: ReactNode;
  icon?: ElementType;
  /** Date, ISO string or epoch ms, rendered with `Timestamp`. */
  time?: Date | string | number;
  tone?: MailEventTone;
}

/** A thread line item (assignment, status change): small centred muted text between hairlines. Wrap several in a `<ul>`. */
export const MailEvent = forwardRef<HTMLLIElement, MailEventProps>(
  ({ children, icon: Icon, time, tone = "neutral", className, ...props }, ref) => (
    <li
      ref={ref}
      data-tone={tone}
      className={cn("flex min-w-0 list-none items-center gap-3 py-1 text-xs", TONE[tone], className)}
      {...props}
    >
      <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-foreground/10 dark:bg-border" />
      <span className="flex min-w-0 max-w-[calc(100%-3.5rem)] flex-wrap items-center justify-center gap-x-1.5 text-center [overflow-wrap:anywhere]">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
        <span>{children}</span>
        {time !== undefined ? <Timestamp value={time} className="tabular-nums" /> : null}
      </span>
      <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-foreground/10 dark:bg-border" />
    </li>
  ),
);
MailEvent.displayName = "MailEvent";
