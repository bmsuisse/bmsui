import { AlertTriangle, Ban, ChevronDown, CircleStop } from "lucide-react";
import type { ComponentType, HTMLAttributes, ReactElement, ReactNode } from "react";
import { forwardRef, useId, useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { AiMarker } from "./AiMarker";

/** Lifecycle state of a single step inside an `AiActivity` run. */
export type AiActivityStepStatus = "running" | "done" | "failed" | "denied" | "interrupted";

export interface AiActivityStep {
  /** Stable key. */
  id: string;
  label: string;
  detail?: ReactNode;
  status: AiActivityStepStatus;
  /** Replaces the default status glyph in the expanded list. */
  icon?: ComponentType<{ className?: string }>;
  /** 0..100 while running. */
  percent?: number;
}

export interface AiActivityProps extends HTMLAttributes<HTMLDivElement> {
  /** Explicit, never inferred from `steps` — a turn can be running with no step yet, or done with a step still marked running. */
  status: "running" | "done";
  /** Shown while running with no active step. An empty string means glyph only. */
  idleLabel?: string;
  steps?: AiActivityStep[];
  /** Controlled disclosure state. */
  expanded?: boolean;
  /** Defaults to open when any step is `denied` or `interrupted`. */
  defaultExpanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  /** Replaces the leading glyph (a consumer may pass its own brand spinner). */
  glyph?: ReactNode;
  /** `comfortable`: indented under an assistant message. `compact`: full width, for a narrow sidebar. @default "comfortable" */
  density?: "comfortable" | "compact";
  labels?: { moreSteps?: (n: number) => string; failed?: string; denied?: string; interrupted?: string };
  testId?: string;
}

const DEFAULT_LABELS: Required<NonNullable<AiActivityProps["labels"]>> = {
  moreSteps: (n) => `${n} more`,
  failed: "Failed",
  denied: "Denied",
  interrupted: "Interrupted",
};

// Colour rule extends ConfidenceIndicator's: never green for a finished step
// (a completed tool call is not a success signal — it would compete with real
// outcome badges elsewhere in the UI), amber for the two "a human/policy
// stepped in" states (denied/interrupted — the same amber pair AlertBox's
// warning variant and ConfidenceIndicator's low band use), and red reserved
// for `failed`, a genuine error. Status is never colour-only: each of the
// three non-neutral states also carries a distinct icon and accessible text.
const STATUS_CLASS: Record<AiActivityStepStatus, string> = {
  running: "text-muted-foreground",
  done: "text-muted-foreground",
  failed: "text-destructive",
  denied: "text-amber-700 dark:text-amber-300",
  interrupted: "text-amber-700 dark:text-amber-300",
};

function StatusGlyph({
  step,
  labels,
}: {
  step: AiActivityStep;
  labels: Required<NonNullable<AiActivityProps["labels"]>>;
}): ReactElement {
  const Icon = step.icon;
  if (Icon) {
    return <Icon className={cn("size-3.5 shrink-0", STATUS_CLASS[step.status])} />;
  }
  switch (step.status) {
    case "failed":
      return (
        <span className={cn("inline-flex items-center gap-1", STATUS_CLASS.failed)}>
          <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="sr-only">{labels.failed}</span>
        </span>
      );
    case "denied":
      return (
        <span className={cn("inline-flex items-center gap-1", STATUS_CLASS.denied)}>
          <Ban aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="sr-only">{labels.denied}</span>
        </span>
      );
    case "interrupted":
      return (
        <span className={cn("inline-flex items-center gap-1", STATUS_CLASS.interrupted)}>
          <CircleStop aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="sr-only">{labels.interrupted}</span>
        </span>
      );
    default:
      return <span className="size-3.5 shrink-0" aria-hidden="true" />;
  }
}

/** Inline accessible text next to the icon for non-neutral statuses, shown
 * (not just sr-only) in the expanded list so the reason for a denial/failure
 * doesn't rely on hover or a screen reader alone. */
function StatusText({
  step,
  labels,
}: {
  step: AiActivityStep;
  labels: Required<NonNullable<AiActivityProps["labels"]>>;
}): ReactElement | null {
  if (step.status === "failed") return <span className={STATUS_CLASS.failed}>{labels.failed}</span>;
  if (step.status === "denied") return <span className={STATUS_CLASS.denied}>{labels.denied}</span>;
  if (step.status === "interrupted") return <span className={STATUS_CLASS.interrupted}>{labels.interrupted}</span>;
  return null;
}

/**
 * `AiActivity` generalises two components a real chat product had built
 * separately: a live "AI is doing X" strip (spinner + label + optional
 * percent + truncated detail + a disclosure for the rest of the steps) and a
 * finished-turn collapsed step summary (one muted line, expandable to the
 * full list with a left border). Side by side they turned out to be the same
 * widget in two lifecycle states — a leading glyph, a one-line summary, and
 * an optional expanded list — which is why they are one component here and
 * `status` is an explicit prop rather than inferred from `steps`: a turn can
 * be `"running"` with no step yet (idle label only), and a turn can be
 * `"done"` while a step object is still stuck at `status: "running"` (a
 * stream that was cut off), so the component's own lifecycle can never be
 * derived from the steps array without guessing.
 *
 * **Auto-expand on denied/interrupted.** When neither `expanded` nor
 * `defaultExpanded` is given, the list defaults open if any step is `denied`
 * or `interrupted`. This is the entire reason the disclosure exists in this
 * shape rather than as a plain "N more" counter: a denied tool call (a
 * permission the user or a policy refused) or an interrupted one (the user
 * hit stop mid-call) is exactly the kind of outcome that must never be able
 * to hide behind a collapsed "3 more" — a reader who never expands the list
 * would otherwise never learn that something was blocked or cut off.
 *
 * **Colour never carries status alone.** `running`/`done` are
 * `text-muted-foreground` — deliberately never green, matching
 * `ConfidenceIndicator`'s house rule: a finished tool call finishing is not a
 * success signal, and green here would compete with the real outcome badges
 * (`StatusBadge`) a consuming screen already renders. `failed` earns
 * `text-destructive` because it is a real error. `denied`/`interrupted` share
 * the amber pair `text-amber-700 dark:text-amber-300` reused from
 * `AlertBox`'s warning variant and `ConfidenceIndicator`'s low band, so the
 * tone reads identically everywhere it appears. Every non-neutral status also
 * carries a distinct icon (`AlertTriangle`/`Ban`/`CircleStop`) plus visible,
 * not just `sr-only`, text via `labels` — colour is reinforcement, not the
 * only channel.
 *
 * **The nested `AiMarker` is always `decorative`.** The root already owns
 * `role="status"` while running; `AiMarker`'s own live region would announce
 * the same "AI is working" event a second time. `AiMarker` also owns the
 * library's one pulse keyframe — this component does not add a second one.
 *
 * **Not built here** (deliberately out of scope): step grouping / duplicate
 * collapsing, SQL rendering, a tool-name→icon or tool-name→label map,
 * delegation/subagent rows, a rotating "thinking phrase" list, a background
 * job poller, or a vertical stepper timeline — that last one is what
 * `Stepper` already does for a wizard-style, position-based flow. This
 * component's list is a flat, time-ordered activity log for one turn, not a
 * multi-stage form.
 */
export const AiActivity = forwardRef<HTMLDivElement, AiActivityProps>(function AiActivity(
  {
    status,
    idleLabel = "",
    steps = [],
    expanded,
    defaultExpanded,
    onExpandedChange,
    glyph,
    density = "comfortable",
    labels,
    testId,
    className,
    ...props
  },
  ref,
): ReactElement {
  const l = { ...DEFAULT_LABELS, ...labels };
  const listId = useId();

  const hasSensitiveStep = steps.some((s) => s.status === "denied" || s.status === "interrupted");
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(defaultExpanded ?? hasSensitiveStep);
  const isControlled = expanded != null;
  const open = isControlled ? expanded : uncontrolledOpen;

  const setOpen = (next: boolean): void => {
    if (!isControlled) setUncontrolledOpen(next);
    onExpandedChange?.(next);
  };

  const activeStep = useMemo(() => steps.find((s) => s.status === "running"), [steps]);
  const firstStep = steps[0];

  const summaryLabel = activeStep ? activeStep.label : status === "running" ? idleLabel : (firstStep?.label ?? "");
  const summaryPercent = activeStep?.percent;
  const summaryDetail = activeStep?.detail;
  const showToggle = steps.length > 1;
  const collapsedCount = Math.max(0, steps.length - 1);

  const defaultGlyph =
    status === "running" ? (
      <AiMarker pulse decorative label="" size="xs" variant="inline" />
    ) : (
      <AiMarker decorative label="" size="xs" variant="inline" />
    );

  return (
    <div
      ref={ref}
      data-slot="ai-activity"
      data-testid={testId}
      data-status={status}
      role={status === "running" ? "status" : undefined}
      className={cn(
        "flex flex-col gap-1 text-xs",
        density === "comfortable" ? "ml-6 max-w-prose" : "w-full",
        className,
      )}
      {...props}
    >
      <div data-slot="ai-activity-summary" className="flex min-w-0 items-center gap-1.5">
        <span data-slot="ai-activity-glyph" className="shrink-0">
          {glyph ?? defaultGlyph}
        </span>
        {summaryLabel && (
          <span className="shrink-0 truncate text-foreground/80" data-slot="ai-activity-label">
            {summaryLabel}
          </span>
        )}
        {summaryPercent != null && (
          <span className="shrink-0 tabular-nums text-muted-foreground" data-slot="ai-activity-percent">
            {Math.round(summaryPercent)}%
          </span>
        )}
        {summaryDetail != null && (
          <span
            data-slot="ai-activity-detail"
            className="min-w-0 truncate font-mono text-[10.5px] text-muted-foreground"
          >
            {summaryDetail}
          </span>
        )}
        {showToggle && (
          <button
            type="button"
            data-slot="ai-activity-toggle"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen(!open)}
            className="ml-auto flex shrink-0 items-center gap-0.5 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn("size-3 motion-safe:transition-transform", open && "rotate-180")}
            />
            {l.moreSteps(collapsedCount)}
          </button>
        )}
      </div>

      {steps.length > 1 && (
        <div
          id={listId}
          data-slot="ai-activity-list"
          hidden={!open}
          className={cn(
            "grid overflow-hidden motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0">
            <ul className="flex flex-col gap-1.5 border-l border-border py-1 pl-3">
              {steps.map((step) => (
                <li key={step.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <StatusGlyph step={step} labels={l} />
                    <span className={cn("truncate", STATUS_CLASS[step.status])}>{step.label}</span>
                    <StatusText step={step} labels={l} />
                  </div>
                  {step.detail != null && (
                    <div className="min-w-0 truncate pl-5 font-mono text-[10.5px] text-muted-foreground">
                      {step.detail}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
});
