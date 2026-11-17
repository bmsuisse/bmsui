import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  Children,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  forwardRef,
  isValidElement,
  useState,
} from "react";
import { FoldPanel } from "../../lib/FoldPanel";
import { SHIMMER_CLASSES, useShimmer } from "../../lib/useShimmer";
import { cn } from "../../lib/utils";
import { Collapsible, CollapsibleTrigger } from "../../primitives/collapsible";
import { CodeBlock } from "../code-block/CodeBlock";

export type ToolCallStatus = "pending" | "running" | "done" | "error";

export interface ToolCallLabels {
  pending: string;
  running: string;
  done: string;
  error: string;
  input: string;
  output: string;
  /** Title of the error block. */
  errorDetails: string;
  /** "3 steps" / "1 step" in `ToolCallGroup`'s header. */
  steps: (n: number) => string;
}

export const defaultToolCallLabels: ToolCallLabels = {
  pending: "Waiting",
  running: "Running",
  done: "Done",
  error: "Failed",
  input: "Input",
  output: "Output",
  errorDetails: "Error",
  steps: (n) => `${n} ${n === 1 ? "step" : "steps"}`,
};

/** `340 ms`, `1.2 s`, `2 min 5 s`. */
export function formatToolDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)} min ${total % 60} s`;
}

/** Strings as given, nodes as given, everything else pretty-printed JSON. */
function renderPayload(value: unknown, title: string, language?: string): ReactNode {
  if (isValidElement(value)) return value;
  let code: string;
  let lang = language;
  if (typeof value === "string") code = value;
  else {
    lang ??= "json";
    try {
      code = JSON.stringify(value, null, 2) ?? "null";
    } catch {
      code = String(value);
    }
  }
  return <CodeBlock code={code} language={lang} title={title} maxHeight={192} wrap />;
}

const STATUS_ICON_CLASS = "h-4 w-4 shrink-0";

const StatusIcon = ({ status, label }: { status: ToolCallStatus; label: string }): ReactElement => (
  <span role="img" aria-label={label} className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
    {status === "running" ? (
      <ArrowPathIcon aria-hidden="true" className={cn(STATUS_ICON_CLASS, "animate-spin text-sky-700 motion-reduce:animate-none dark:text-sky-300")} />
    ) : status === "done" ? (
      <CheckCircleIcon aria-hidden="true" className={cn(STATUS_ICON_CLASS, "text-emerald-700 dark:text-emerald-300")} />
    ) : status === "error" ? (
      <ExclamationTriangleIcon aria-hidden="true" className={cn(STATUS_ICON_CLASS, "text-red-700 dark:text-red-300")} />
    ) : (
      <span aria-hidden="true" className="h-3 w-3 rounded-full border border-dashed border-muted-foreground" />
    )}
  </span>
);

export interface ToolCallCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Tool name, shown in mono ("run_query"). */
  name: string;
  /** @default "done" */
  status?: ToolCallStatus;
  /** One muted line after the name ("3 rows from orders"). */
  summary?: ReactNode;
  /** Milliseconds (formatted) or a ready string. Shown once finished or while running if given. */
  duration?: number | string;
  /** Replaces the status icon. */
  icon?: ReactNode;
  /** Arguments: a string, a node, or any JSON value (pretty-printed). */
  input?: unknown;
  /** Result, same shapes as `input`. */
  output?: unknown;
  /** Failure message or node, shown in the error tone. Set `status="error"` too. */
  error?: ReactNode;
  /** Extra detail below input/output. */
  children?: ReactNode;
  /**
   * Open at first. Default follows `status`: open while `running` or `error`, closed otherwise —
   * and it folds when a running call finishes, until the reader toggles it themselves.
   */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  labels?: Partial<ToolCallLabels>;
}

/**
 * One tool/function call in an agent's turn: name, status icon, summary and duration on one line,
 * input/output behind a fold. Open while running or failed, folded once done. Presentational:
 * feed it from whatever runtime you stream with. Several in a row go in a `ToolCallGroup`.
 */
export const ToolCallCard = forwardRef<HTMLDivElement, ToolCallCardProps>(
  (
    { name, status = "done", summary, duration, icon, input, output, error, children, defaultOpen, open: openProp, onOpenChange, labels, className, ...props },
    ref,
  ) => {
    const l = { ...defaultToolCallLabels, ...labels };
    const [userOpen, setUserOpen] = useState<boolean | null>(null);
    const hasBody = input !== undefined || output !== undefined || error != null || children != null;
    const open = hasBody && (openProp ?? userOpen ?? (status === "running" || status === "error" || (defaultOpen ?? false)));
    const statusLabel = l[status];
    const shimmer = useShimmer<HTMLSpanElement>(status === "running");
    const time = duration == null ? null : typeof duration === "number" ? formatToolDuration(duration) : duration;

    const head = (
      <>
        {icon ?? <StatusIcon status={status} label={statusLabel} />}
        <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-2">
          <span
            ref={shimmer}
            className={cn("min-w-0 truncate font-mono text-xs font-medium text-foreground sm:max-w-[60%] sm:shrink-0", status === "running" && SHIMMER_CLASSES)}
          >
            {name}
          </span>
          {summary != null ? <span className="min-w-0 truncate text-xs text-muted-foreground sm:flex-1">{summary}</span> : null}
        </span>
        {time ? <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{time}</span> : null}
      </>
    );
    return (
      <Collapsible
        ref={ref}
        open={open}
        onOpenChange={(next) => {
          if (openProp === undefined) setUserOpen(next);
          onOpenChange?.(next);
        }}
        data-slot="tool-call-card"
        data-status={status}
        className={cn(
          "min-w-0 max-w-full rounded-lg border border-foreground/10 bg-background dark:border-border",
          status === "error" && "border-red-700/40 dark:border-red-300/40",
          className,
        )}
        {...props}
      >
        {hasBody ? (
          <CollapsibleTrigger className="group/tc flex min-h-9 w-full items-center gap-2 rounded-[inherit] px-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {head}
            <ChevronRightIcon
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-out group-data-[state=open]/tc:rotate-90 motion-reduce:transition-none"
            />
          </CollapsibleTrigger>
        ) : (
          <div className="flex min-h-9 items-center gap-2 px-3 py-1.5">{head}</div>
        )}
        {hasBody ? (
          <FoldPanel open={open}>
            <div className="flex min-w-0 flex-col gap-2 border-t border-foreground/10 p-3 dark:border-border">
              {input !== undefined ? renderPayload(input, l.input) : null}
              {output !== undefined ? renderPayload(output, l.output) : null}
              {error != null ? (
                <div role="alert" className="rounded-md bg-red-700/[0.06] p-2.5 text-xs text-red-700 [overflow-wrap:anywhere] dark:bg-red-300/10 dark:text-red-300">
                  <p className="mb-0.5 font-semibold">{l.errorDetails}</p>
                  {error}
                </div>
              ) : null}
              {children}
            </div>
          </FoldPanel>
        ) : null}
      </Collapsible>
    );
  },
);
ToolCallCard.displayName = "ToolCallCard";

export interface ToolCallGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The `ToolCallCard`s (or anything else) in order. */
  children: ReactNode;
  /** Shown in the header; counted from `children` when omitted. */
  count?: number;
  /** A step is still running: header shows a spinner and the group opens. */
  active?: boolean;
  /** Open at rest. @default false */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  labels?: Partial<Pick<ToolCallLabels, "steps" | "running">>;
}

/**
 * Folds a run of tool calls into one line, "4 steps", so a long agent turn does not bury its
 * answer; open while `active`, folded once done, the steps inside keep their own fold.
 */
export const ToolCallGroup = forwardRef<HTMLDivElement, ToolCallGroupProps>(
  ({ children, count, active = false, defaultOpen = false, open: openProp, onOpenChange, labels, className, ...props }, ref) => {
    const l = { ...defaultToolCallLabels, ...labels };
    const [userOpen, setUserOpen] = useState<boolean | null>(null);
    const open = openProp ?? userOpen ?? (active || defaultOpen);
    const n = count ?? Children.toArray(children).length;
    const shimmer = useShimmer<HTMLSpanElement>(active);
    return (
      <Collapsible
        ref={ref}
        open={open}
        onOpenChange={(next) => {
          if (openProp === undefined) setUserOpen(next);
          onOpenChange?.(next);
        }}
        data-slot="tool-call-group"
        className={cn("min-w-0 max-w-full", className)}
        {...props}
      >
        <CollapsibleTrigger className="group/tg -mx-1 flex min-h-8 max-w-full items-center gap-2 rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
          {active ? (
            <ArrowPathIcon aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
          ) : null}
          <span ref={shimmer} className={cn("tabular-nums", SHIMMER_CLASSES)}>
            {l.steps(n)}
          </span>
          {active ? <span className="sr-only">{l.running}</span> : null}
          <ChevronRightIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 transition-[rotate] duration-200 ease-out group-data-[state=open]/tg:rotate-90 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
        <FoldPanel open={open}>
          <div className="flex min-w-0 flex-col gap-1.5 pb-1 pt-1">{children}</div>
        </FoldPanel>
      </Collapsible>
    );
  },
);
ToolCallGroup.displayName = "ToolCallGroup";
