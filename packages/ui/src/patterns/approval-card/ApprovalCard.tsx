import { CheckIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { type HTMLAttributes, type ReactNode, forwardRef, useId } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";
import { LoadingSpinner } from "../loading-spinner/LoadingSpinner";
import { StatusBadge, type StatusTone } from "../status-badge/StatusBadge";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalChoice {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface ApprovalCardLabels {
  approve: string;
  reject: string;
  pending: string;
  approved: string;
  rejected: string;
  /** Group name of the choice buttons. */
  choices: string;
  /** Shown on the busy button. */
  working: string;
}

export const defaultApprovalCardLabels: ApprovalCardLabels = {
  approve: "Approve",
  reject: "Decline",
  pending: "Needs your approval",
  approved: "Approved",
  rejected: "Declined",
  choices: "Options",
  working: "Working…",
};

const STATUS_TONE: Record<ApprovalStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "error" };

export interface ApprovalCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** What exactly will happen: arguments, a preview, a diff. Rendered between description and actions. */
  details?: ReactNode;
  /** `pending` shows the actions; `approved`/`rejected` freeze the card and show the outcome. Default `pending`. */
  status?: ApprovalStatus;
  onApprove?: () => void;
  onReject?: () => void;
  /** A decision is being sent: disables the actions. Pass `"approve"`/`"reject"` to show which button is working. */
  pending?: boolean | "approve" | "reject";
  /** "Pick one" mode: option buttons replace Approve. A click calls `onChoose` straight away. `onReject` still adds a decline button. */
  choices?: ReadonlyArray<ApprovalChoice>;
  /** The picked option (controlled by the caller; stays highlighted after the decision). */
  selectedChoiceId?: string;
  onChoose?: (id: string) => void;
  /** Shown once decided, e.g. the action's result. */
  result?: ReactNode;
  labels?: Partial<ApprovalCardLabels>;
}

/**
 * Human-in-the-loop decision: "the assistant wants to do X, allow it?". Presentational —
 * the caller owns the decision and its network call. Pending: title, description, the
 * exact details and Approve / Decline (or a list of options). Decided: the actions go away,
 * the outcome stays in a live region so it is announced.
 */
export const ApprovalCard = forwardRef<HTMLElement, ApprovalCardProps>(
  (
    {
      title,
      description,
      details,
      status = "pending",
      onApprove,
      onReject,
      pending = false,
      choices,
      selectedChoiceId,
      onChoose,
      result,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const l = { ...defaultApprovalCardLabels, ...labels };
    const titleId = useId();
    const busy = pending !== false;
    const decided = status !== "pending";
    const choiceMode = choices !== undefined;
    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        data-status={status}
        className={cn(
          "min-w-0 max-w-full overflow-hidden rounded-xl border border-foreground/10 bg-background text-sm dark:border-border",
          className,
        )}
        {...props}
      >
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-foreground/10 px-3 py-2.5 dark:border-border">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary dark:text-ring" aria-hidden="true" />
          <h3 id={titleId} className="min-w-0 flex-1 basis-40 font-semibold [overflow-wrap:anywhere]">
            {title}
          </h3>
          <span role="status">
            <StatusBadge status={status} label={l[status]} tone={STATUS_TONE[status]} />
          </span>
        </div>
        <div className="flex flex-col gap-3 p-3">
          {description ? <div className="text-muted-foreground [overflow-wrap:anywhere]">{description}</div> : null}
          {details ? (
            <div tabIndex={0} className="min-w-0 max-h-72 overflow-auto rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-foreground/10 p-2 dark:border-border [overflow-wrap:anywhere]">
              {details}
            </div>
          ) : null}
          {choiceMode ? (
            <div role="group" aria-label={l.choices} className="flex flex-col gap-2">
              {choices.map((choice, index) => {
                const selected = selectedChoiceId === choice.id;
                const dimmed = decided && !selected;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={decided || busy || choice.disabled}
                    aria-pressed={selected}
                    onClick={() => onChoose?.(choice.id)}
                    className={cn(
                      "flex min-h-11 w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors sm:min-h-10",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                      selected
                        ? "border-primary bg-primary/10 dark:border-ring dark:bg-accent/20"
                        : "border-foreground/10 hover:bg-foreground/6 dark:border-border",
                      dimmed && "opacity-50",
                      "disabled:pointer-events-none",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-medium tabular-nums",
                        selected
                          ? "border-primary bg-primary text-primary-foreground dark:border-accent dark:bg-accent dark:text-accent-foreground"
                          : "border-foreground/20 text-muted-foreground dark:border-border",
                      )}
                    >
                      {selected ? <CheckIcon className="size-3 stroke-[3]" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium [overflow-wrap:anywhere]">{choice.label}</span>
                      {choice.description ? (
                        <span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">
                          {choice.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {!decided && (!choiceMode || onReject) ? (
            <div className="flex flex-wrap items-center gap-2">
              {!choiceMode ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={onApprove}
                  className="max-sm:h-10 max-sm:flex-1"
                >
                  {pending === "approve" ? <LoadingSpinner size="sm" className="text-inherit" label={l.working} /> : l.approve}
                </Button>
              ) : null}
              {onReject ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={onReject}
                  className="max-sm:h-10 max-sm:flex-1"
                >
                  {pending === "reject" ? <LoadingSpinner size="sm" label={l.working} /> : l.reject}
                </Button>
              ) : null}
            </div>
          ) : null}
          {decided && result ? <div className="text-muted-foreground [overflow-wrap:anywhere]">{result}</div> : null}
        </div>
      </section>
    );
  },
);
ApprovalCard.displayName = "ApprovalCard";
