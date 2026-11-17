import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { ArrowPathIcon, CheckIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  type ComponentType,
  createContext,
  isValidElement,
  type LiHTMLAttributes,
  type OlHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SVGProps,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../primitives/collapsible";
import type { StatusTone } from "../status-badge/StatusBadge";
import { Timestamp, type TimestampFormat } from "../timestamp/Timestamp";

export type TimelineStatus = "done" | "active" | "pending" | "error";
export type TimelineSize = "sm" | "md";

export interface TimelineLabels {
  /** Text of the trailing loader row when `pending` is `true`. */
  pending: string;
}

export const defaultTimelineLabels: TimelineLabels = { pending: "Loading…" };

interface TimelineContextValue {
  size: TimelineSize;
  timeFormat: TimestampFormat;
  locale: string;
  animated: boolean;
}

const TimelineContext = createContext<TimelineContextValue>({
  size: "md",
  timeFormat: "relative",
  locale: "de-CH",
  animated: true,
});

export interface TimelineProps extends OlHTMLAttributes<HTMLOListElement> {
  /** `md` (default, 20px markers, 14px text) or `sm` (16px markers, 12px text) for chat bubbles and side panels. */
  size?: TimelineSize;
  /** How an item's `time` is written when it is a date. @default "relative" */
  timeFormat?: TimestampFormat;
  /** BCP 47 locale for dates. @default "de-CH" */
  locale?: string;
  /**
   * A last row with a spinner for work still to come ("Waiting for the next step…"). `true` uses
   * `labels.pending`; pass a node for your own text.
   */
  pending?: boolean | ReactNode;
  labels?: Partial<TimelineLabels>;
  /** Transitions of the collapsing details. @default true */
  animated?: boolean;
}

/**
 * A vertical rail of events: an `<ol>` of `TimelineItem`s (optionally under
 * `TimelineGroup` date headers). Use it for activity history, audit trails and
 * the steps of a running process; finished steps recede while the active one
 * stays prominent. For a numbered wizard header use `Stepper` instead.
 */
export const Timeline = ({
  size = "md",
  timeFormat = "relative",
  locale = "de-CH",
  pending,
  labels,
  animated = true,
  className,
  children,
  ...props
}: TimelineProps): ReactElement => {
  const text = { ...defaultTimelineLabels, ...labels };
  const pendingNode = pending === true ? text.pending : pending;
  return (
    <TimelineContext.Provider value={{ size, timeFormat, locale, animated }}>
      <ol data-slot="timeline" data-size={size} className={cn("m-0 list-none p-0", className)} {...props}>
        {children}
        {pendingNode ? (
          <li data-slot="timeline-pending" className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
            <span className={cn("flex items-center justify-center", size === "sm" ? "h-4 w-4" : "h-5 w-5")}>
              <ArrowPathIcon
                aria-hidden="true"
                className={cn(
                  "animate-spin text-muted-foreground motion-reduce:animate-none",
                  size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
                )}
              />
            </span>
            <span
              role="status"
              className={cn("min-w-0 text-muted-foreground", size === "sm" ? "text-xs leading-4" : "text-sm leading-5")}
            >
              {pendingNode}
            </span>
          </li>
        ) : null}
      </ol>
    </TimelineContext.Provider>
  );
};

export interface TimelineGroupProps extends Omit<LiHTMLAttributes<HTMLLIElement>, "title"> {
  /** The group header ("Today", "10.11.2026"). */
  label: ReactNode;
}

/** A dated section of a `Timeline`: a small header over its own list of items. */
export const TimelineGroup = ({ label, className, children, ...props }: TimelineGroupProps): ReactElement => {
  const id = useId();
  return (
    <li data-slot="timeline-group" className={cn("mt-4 first:mt-0", className)} {...props}>
      <p id={id} className="mb-2 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <ol aria-labelledby={id} className="m-0 list-none p-0">
        {children}
      </ol>
    </li>
  );
};

const MARKER_TONE: Record<StatusTone, string> = {
  success: "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  info: "bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  error: "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  neutral: "bg-foreground/[0.07] text-muted-foreground dark:bg-foreground/10",
};

const DOT_TONE: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
  error: "bg-red-500",
  neutral: "bg-muted-foreground/70",
};

const STATUS_TONE: Record<TimelineStatus, StatusTone> = {
  done: "success",
  active: "info",
  pending: "neutral",
  error: "error",
};

const TITLE_CLASS: Record<TimelineStatus | "none", string> = {
  none: "font-medium text-foreground",
  // Finished work recedes: normal weight, a touch lighter.
  done: "font-normal text-foreground/80",
  active: "font-semibold text-foreground",
  pending: "font-normal text-muted-foreground",
  error: "font-medium text-red-700 dark:text-red-300",
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/** A Date, epoch ms or ISO string becomes a `Timestamp`; any other node is shown as given. */
function isTimeValue(value: unknown): value is Date | string | number {
  if (value instanceof Date || typeof value === "number") return true;
  return typeof value === "string" && ISO_DAY.test(value) && !Number.isNaN(Date.parse(value));
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function renderIcon(icon: IconComponent | ReactNode, className: string): ReactNode {
  if (icon == null || icon === false || icon === true) return null;
  if (typeof icon === "function" || (typeof icon === "object" && !isValidElement(icon) && "$$typeof" in icon)) {
    const Icon = icon as IconComponent;
    return <Icon aria-hidden="true" className={className} />;
  }
  return icon as ReactNode;
}

export interface TimelineItemProps extends Omit<LiHTMLAttributes<HTMLLIElement>, "title"> {
  /**
   * `done`, `active` (spinner, prominent, `aria-current="step"`), `pending` (hollow marker, muted) or `error`.
   * Omit for a plain event: a dot in the `tone` colour.
   */
  status?: TimelineStatus;
  /** Marker colour. Defaults from `status` (done → success, active → info, error → error), else neutral. */
  tone?: StatusTone;
  /** Replaces the marker's default glyph (check, spinner, dot): a heroicon component or any node. */
  icon?: IconComponent | ReactNode;
  title: ReactNode;
  /** A `Date`, epoch ms or ISO string renders as `Timestamp`; any other node is shown as it is. */
  time?: ReactNode | Date;
  /** Per-item override of the timeline's `timeFormat`. */
  timeFormat?: TimestampFormat;
  /** One muted line under the title. */
  description?: ReactNode;
  /** Detail under the title (a message, a payload, a mini table). Folds when `collapsible`. */
  children?: ReactNode;
  /**
   * Fold the detail behind a toggle on the title. Uncontrolled, it follows the status until the user
   * toggles it (opens while `active`/`error`, folds otherwise), unless `defaultOpen` is given.
   */
  collapsible?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  "data-testid"?: string;
}

/** One event on the rail: marker, title, time, description and optional (foldable) detail. */
export const TimelineItem = ({
  status,
  tone,
  icon,
  title,
  time,
  timeFormat,
  description,
  children,
  collapsible = false,
  defaultOpen,
  open: openProp,
  onOpenChange,
  className,
  "data-testid": testId,
  ...props
}: TimelineItemProps): ReactElement => {
  const ctx = useContext(TimelineContext);
  const { size } = ctx;
  const sm = size === "sm";
  const resolvedTone = tone ?? (status ? STATUS_TONE[status] : "neutral");
  const hasDetail = children != null && children !== false;
  const foldable = collapsible && hasDetail;

  const followsStatus = defaultOpen === undefined && openProp === undefined;
  const statusOpen = status === "active" || status === "error";
  const [inner, setInner] = useState(defaultOpen ?? statusOpen);
  const touched = useRef(false);
  useEffect(() => {
    if (followsStatus && !touched.current) setInner(statusOpen);
  }, [followsStatus, statusOpen]);
  const open = openProp ?? inner;
  const setOpen = (next: boolean): void => {
    touched.current = true;
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };
  // `inert` keeps Tab out of the folded detail; set on the node because React 18 and 19 type it differently.
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    detailRef.current?.toggleAttribute("inert", !open);
  }, [open, foldable]);

  const iconClass = sm ? "h-2.5 w-2.5" : "h-3 w-3";
  const box = sm ? "h-4 w-4" : "h-5 w-5";
  const custom = renderIcon(icon, iconClass);
  let glyph: ReactNode = custom;
  if (!glyph) {
    if (status === "done") glyph = <CheckIcon aria-hidden="true" strokeWidth={3} className={iconClass} />;
    else if (status === "error") glyph = <ExclamationTriangleIcon aria-hidden="true" className={iconClass} />;
    else if (status === "active")
      glyph = <ArrowPathIcon aria-hidden="true" className={cn(iconClass, "animate-spin motion-reduce:animate-none")} />;
  }

  let marker: ReactNode;
  if (!glyph && status === "pending") {
    marker = (
      <span data-slot="timeline-marker" className={cn("grid shrink-0 place-items-center", box)}>
        <span className={cn("rounded-full ring-1 ring-muted-foreground/60", sm ? "h-2 w-2" : "h-2.5 w-2.5")} />
      </span>
    );
  } else if (glyph) {
    marker = (
      <span
        data-slot="timeline-marker"
        className={cn(
          "grid shrink-0 place-items-center rounded-full",
          box,
          MARKER_TONE[resolvedTone],
          status === "active" && "ring-2 ring-sky-500/30 dark:ring-sky-400/40",
        )}
      >
        {glyph}
      </span>
    );
  } else {
    marker = (
      <span data-slot="timeline-marker" className={cn("grid shrink-0 place-items-center", box)}>
        <span className={cn("rounded-full", sm ? "h-1.5 w-1.5" : "h-2 w-2", DOT_TONE[resolvedTone])} />
      </span>
    );
  }

  const titleCls = cn(
    "min-w-0 break-words",
    sm ? "text-xs leading-4" : "text-sm leading-5",
    TITLE_CLASS[status ?? "none"],
  );
  const timeNode = isTimeValue(time) ? (
    <Timestamp value={time} format={timeFormat ?? ctx.timeFormat} locale={ctx.locale} className="text-muted-foreground" />
  ) : (
    (time as ReactNode)
  );
  const animated = ctx.animated;

  const detail = hasDetail ? (
    foldable ? (
      <CollapsibleContent
        forceMount
        ref={detailRef}
        aria-hidden={!open || undefined}
        className={cn(
          "group/tid grid grid-rows-[0fr] overflow-hidden data-[state=open]:grid-rows-[1fr]",
          animated && "transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
        )}
      >
        <div
          className={cn(
            "min-h-0 min-w-0",
            animated &&
              "transition-opacity duration-200 ease-out group-data-[state=closed]/tid:opacity-0 group-data-[state=closed]/tid:duration-150 group-data-[state=closed]/tid:ease-in motion-reduce:transition-none",
          )}
        >
          <div className={cn("pt-1.5", sm ? "text-xs" : "text-sm")}>{children}</div>
        </div>
      </CollapsibleContent>
    ) : (
      <div className={cn("pt-1.5", sm ? "text-xs" : "text-sm")}>{children}</div>
    )
  ) : null;

  const body = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        {foldable ? (
          <CollapsibleTrigger
            data-slot="timeline-toggle"
            className={cn(
              "group/tt -mx-1 flex min-w-0 items-start gap-1 rounded-md px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              titleCls,
            )}
          >
            <span className="min-w-0 break-words">{title}</span>
            <ChevronRightIcon
              aria-hidden="true"
              className={cn(
                "shrink-0 text-muted-foreground group-data-[state=open]/tt:rotate-90",
                animated && "transition-[rotate] duration-200 ease-out motion-reduce:transition-none",
                sm ? "mt-px h-3.5 w-3.5" : "mt-0.5 h-4 w-4",
              )}
            />
          </CollapsibleTrigger>
        ) : (
          <span className={titleCls}>{title}</span>
        )}
        {timeNode != null && timeNode !== false ? (
          <span className={cn("shrink-0 tabular-nums text-muted-foreground", sm ? "text-[11px]" : "text-xs")}>
            {timeNode}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className={cn("mt-0.5 text-muted-foreground", sm ? "text-xs" : "text-sm")}>{description}</p>
      ) : null}
      {detail}
    </>
  );

  return (
    <li
      data-slot="timeline-item"
      data-status={status}
      data-testid={testId}
      aria-current={status === "active" ? "step" : undefined}
      className={cn("group/ti grid grid-cols-[auto_minmax(0,1fr)] gap-x-3", className)}
      {...props}
    >
      <div className="flex flex-col items-center">
        {marker}
        <span
          aria-hidden="true"
          data-slot="timeline-connector"
          className="my-1 min-h-3 w-px flex-1 bg-foreground/15 group-last/ti:hidden dark:bg-border"
        />
      </div>
      <div className="min-w-0 pb-4 group-last/ti:pb-0">
        {foldable ? (
          <Collapsible open={open} onOpenChange={setOpen}>
            {body}
          </Collapsible>
        ) : (
          body
        )}
      </div>
    </li>
  );
};
