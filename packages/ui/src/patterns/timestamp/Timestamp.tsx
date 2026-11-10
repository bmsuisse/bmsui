import { type HTMLAttributes, type ReactElement, useEffect, useMemo, useState } from "react";
import { useHydrated } from "../../lib/useHydrated";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../primitives/tooltip";
import { formatRelativeTime, type RelativeTimeStyle, relativeRefreshInterval } from "./formatRelativeTime";

export type TimestampFormat = "relative" | "date" | "datetime" | "time";

const ABSOLUTE: Record<Exclude<TimestampFormat, "relative">, Intl.DateTimeFormatOptions> = {
  date: { day: "2-digit", month: "2-digit", year: "numeric" },
  datetime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
  time: { hour: "2-digit", minute: "2-digit" },
};
const FULL: Intl.DateTimeFormatOptions = { dateStyle: "full", timeStyle: "medium" };

/**
 * Time-zone- and clock-independent text for the server render and hydration
 * ("2026-11-10 12:00 UTC"): the local-time and relative wording only appear
 * once mounted, so server and client markup match.
 */
function stableText(date: Date, format: TimestampFormat): string {
  const iso = date.toISOString();
  if (format === "date") return iso.slice(0, 10);
  if (format === "time") return `${iso.slice(11, 16)} UTC`;
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

export interface TimestampProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** A `Date`, ISO string, or epoch **milliseconds** (what `Date.now()` returns). */
  value: Date | string | number;
  /** `relative` (default, "vor 5 Min."), `date` (10.11.2026), `datetime` (10.11.2026, 14:05) or `time` (14:05). */
  format?: TimestampFormat;
  /** BCP 47 locale for all wording and date formats. @default "de-CH" */
  locale?: string;
  /** Relative wording length: `short` ("vor 5 Min.", default), `long` ("vor 5 Minuten"), `narrow`. */
  relativeStyle?: RelativeTimeStyle;
  /** Re-render relative text as time passes (every 10s → hourly, depending on age). @default true */
  live?: boolean;
  /** Tooltip with the full date and time. @default true for `relative`, false otherwise */
  tooltip?: boolean;
  /** Shown when `value` is not a valid date. @default "—" */
  invalidLabel?: string;
}

/**
 * A point in time as a `<time dateTime>` element. Use it for "last modified",
 * "created", activity feeds: relative by default with the exact date in a
 * tooltip, so the list stays scannable and the precise value is one hover or
 * focus away. Use `format="date"` etc. for a plain absolute value.
 */
export const Timestamp = ({
  value,
  format = "relative",
  locale = "de-CH",
  relativeStyle = "short",
  live = true,
  tooltip,
  invalidLabel = "—",
  className,
  ...props
}: TimestampProps): ReactElement => {
  const date = useMemo(() => toDate(value), [value]);
  const valid = !Number.isNaN(date.getTime());
  const relative = format === "relative";
  const hydrated = useHydrated();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (!relative || !valid) return;
    setNow(new Date());
    if (!live) return;
    let handle: ReturnType<typeof setTimeout>;
    const tick = (): void => {
      const current = new Date();
      setNow(current);
      handle = setTimeout(tick, relativeRefreshInterval(date, current));
    };
    handle = setTimeout(tick, relativeRefreshInterval(date, new Date()));
    return () => clearTimeout(handle);
  }, [relative, live, valid, date]);

  if (!valid) {
    return (
      <span data-testid="timestamp" className={cn("text-muted-foreground", className)} {...props}>
        {invalidLabel}
      </span>
    );
  }

  // Before hydration: no clock and no local time zone, only the stable UTC text.
  const full = hydrated ? new Intl.DateTimeFormat(locale, FULL).format(date) : null;
  const text = !hydrated
    ? stableText(date, format)
    : relative
      ? formatRelativeTime(date, now ?? new Date(), locale, relativeStyle)
      : new Intl.DateTimeFormat(locale, ABSOLUTE[format]).format(date);
  const withTooltip = tooltip ?? relative;

  const time = (
    <time
      dateTime={date.toISOString()}
      data-testid="timestamp"
      aria-label={withTooltip ? (full ? `${text} (${full})` : text) : undefined}
      tabIndex={withTooltip ? 0 : undefined}
      className={cn(
        "whitespace-nowrap tabular-nums",
        withTooltip &&
          "cursor-default rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {text}
    </time>
  );
  if (!withTooltip) return time;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{time}</TooltipTrigger>
        <TooltipContent data-testid="timestamp-tooltip">{full ?? text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
