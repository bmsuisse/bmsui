import { Bell, X } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { AiMarker } from "../ai/AiMarker";
import { Button } from "../../primitives/button";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationCardProps {
  title: ReactNode;
  /** Plain text; clamped to 2 lines in `row` density. */
  body?: ReactNode;
  /** Rendered relative ("2 min ago"); the full date goes in `title=`. */
  timestamp: Date | string;
  unread?: boolean;
  /** `ai` renders an AiMarker; `person` renders the actor's initials. */
  source?: "system" | "person" | "ai";
  actor?: { name: string; avatarUrl?: string };
  /** `high` = left rail in primary; the banner host also uses it to suppress auto-dismiss. @default "normal" */
  priority?: "normal" | "high";
  /** Max 2. */
  actions?: [NotificationAction] | [NotificationAction, NotificationAction];
  /** Whole-card tap (consumer marks read + navigates). */
  onSelect?: () => void;
  /** Banner only. */
  onDismiss?: () => void;
  /** `row` inside the panel, `card` for the banner and a full page. @default "row" */
  density?: "row" | "card";
  /** Renders the card as an `<a>` so a consumer can wire a router link. */
  href?: string;
  labels?: { dismiss?: string };
}

/** first letters of up to the first two words, uppercased — "Maria Keller" -> "MK". */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Small local formatter rather than a dependency: this package ships no date
 * library, and a notification timestamp only ever needs this coarse a scale
 * (nothing here needs weeks/months arithmetic or locale-aware pluralization
 * libraries pull in for). Absolute time always lives alongside this in a
 * `title` attribute and a `<time dateTime>`, so precision loss here is never
 * the only way to read the real time.
 */
function formatRelativeTime(date: Date, now: Date): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "now";
  if (diff < HOUR) return `${Math.round(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.round(diff / HOUR)} h ago`;
  const days = Math.round(diff / DAY);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} d ago`;
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** Leading slot: the AiMarker for `ai`, an avatar circle for `person`/`system`. */
function SourceGlyph({
  source,
  actor,
}: {
  source: NonNullable<NotificationCardProps["source"]>;
  actor?: NotificationCardProps["actor"];
}): ReactElement {
  if (source === "ai") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center">
        <AiMarker size="xs" />
      </span>
    );
  }

  if (source === "person") {
    const name = actor?.name ?? "";
    return (
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-1 ring-border ring-inset">
        {actor?.avatarUrl ? (
          <img src={actor.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{getInitials(name)}</span>
        )}
      </span>
    );
  }

  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border ring-inset">
      <Bell className="size-4" aria-hidden="true" />
    </span>
  );
}

/**
 * The single notification: an event that happened elsewhere (a background
 * job finished, an approval landed, a reminder came due), as opposed to
 * `Toast`'s "feedback about what you just did" — never route an event
 * through `toast()`. This card is the one row shape both the inbox
 * (`NotificationPanel`, `density="row"`) and the arrival banner another
 * component hosts on top of this (`density="card"`) render, kept
 * self-contained and presentational so both callers agree on what a
 * notification looks like.
 *
 * **The nested-interactive-element trap**: a card that is itself a link/
 * button but also carries an action button and a dismiss `x` cannot nest
 * those inside the `<a>`/`<button>` root — invalid HTML for `<button>`, and
 * an accessibility trap either way (nested tab stops, ambiguous activation).
 * This solves it with the "stretched hit target" technique: the real `<a>`/
 * `<button>` is rendered as an absolutely-positioned, visually-transparent
 * overlay (`inset-0`) that is a *sibling* of the visible content, not an
 * ancestor. The visible content stays a plain, non-positioned `<div>`, which
 * CSS always paints (and hit-tests) *beneath* a positioned sibling — so the
 * overlay silently catches clicks anywhere over the card's text. `actions`
 * and the dismiss button are then given their own `position: relative` plus
 * a higher `z-index` than the overlay, which is what lets *them* paint (and
 * receive clicks) on top of the overlay instead of activating it. Because
 * the overlay is a sibling rather than a wrapper, clicking an action was
 * never going to bubble into it in the first place — `stopPropagation` on
 * each action is still added, defensively, for the case where a consumer
 * wraps the whole row in its own click handler (e.g. a `<li onClick>` list).
 */
export const NotificationCard = ({
  title,
  body,
  timestamp,
  unread = false,
  source = "system",
  actor,
  priority = "normal",
  actions,
  onSelect,
  onDismiss,
  density = "row",
  href,
  labels,
}: NotificationCardProps): ReactElement => {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const isCard = density === "card";
  const dismissLabel = labels?.dismiss ?? "Dismiss";
  const accessibleName = typeof title === "string" ? title : "Notification";

  return (
    <div
      data-slot="notification-card"
      data-unread={unread || undefined}
      data-priority={priority}
      className={cn(
        "relative flex gap-3 border-b border-border last:border-b-0",
        isCard ? "items-start rounded-lg border border-border p-4" : "items-start px-3 py-3",
        unread && "bg-primary/10",
        priority === "high" && "border-l-2 border-l-primary",
      )}
    >
      {/* Stretched hit target — see the JSDoc above for why this is a sibling,
          not a wrapper, of the visible content. */}
      {href ? (
        <a
          href={href}
          aria-label={accessibleName}
          className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      ) : onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-label={accessibleName}
          className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      ) : null}

      <SourceGlyph source={source} actor={actor} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start gap-1.5">
          {unread && (
            <span
              aria-hidden="true"
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
            />
          )}
          <p
            className={cn(
              "min-w-0 flex-1 text-foreground [overflow-wrap:anywhere]",
              unread ? "font-semibold" : "font-medium",
              isCard ? "text-sm" : "text-sm",
            )}
          >
            {title}
          </p>
        </div>

        {body != null && (
          <p
            className={cn(
              "text-muted-foreground [overflow-wrap:anywhere]",
              isCard ? "text-sm" : "text-xs [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden",
            )}
          >
            {body}
          </p>
        )}

        <time
          dateTime={date.toISOString()}
          title={date.toLocaleString()}
          className="text-xs text-muted-foreground"
        >
          {formatRelativeTime(date, now)}
        </time>

        {actions && actions.length > 0 && (
          <div className="relative z-20 mt-1.5 flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="outline"
                size="sm"
                className="h-10 sm:h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className={cn(
            "relative z-20 -my-1 flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "sm:size-7",
          )}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
