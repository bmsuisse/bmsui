import { AlertCircle, Check } from "lucide-react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

export interface StepperStep {
  /** Stable key, also what `onStepChange` reports. */
  id: string;
  label: string;
  /** Short second line under the label (a phase name, a hint like "optional"). Hidden in the compact phone bar. */
  description?: string;
  /** Marks the step as needing attention — red marker and icon, regardless of position. */
  error?: boolean;
  /** Replaces the step number inside the marker (completed steps still show a check). */
  icon?: ComponentType<{ className?: string }>;
}

export interface StepperProps {
  steps: StepperStep[];
  /** `id` of the current step. */
  activeStep: string;
  /**
   * Called when the user clicks a reachable step. Omit it for a read-only
   * progress indicator — steps then render as plain markers, not buttons.
   */
  onStepChange?: (id: string) => void;
  /**
   * `id` of the furthest step the user may jump to. Completed steps (before
   * `activeStep`) are always reachable when `onStepChange` is set; this
   * additionally unlocks steps ahead — e.g. after a validation pass lets
   * someone revisit a later step they already filled in.
   * @default activeStep
   */
  furthestStep?: string;
  /** @default "horizontal" */
  orientation?: "horizontal" | "vertical";
  /**
   * How the horizontal stepper renders below the `md` breakpoint:
   * `"compact"` (default) collapses to a one-line "Step 2 of 5 · Label" bar
   * with a segmented track; `"full"` keeps the labelled markers and scrolls
   * them horizontally, centering the active one.
   * @default "compact"
   */
  mobile?: "compact" | "full";
  /** Accessible name of the `<nav>`. @default "Progress" */
  ariaLabel?: string;
  /**
   * Formats the compact bar's counter. @default `(n, total) => \`Step ${n} of ${total}\``
   */
  formatCounter?: (current: number, total: number) => ReactNode;
  className?: string;
}

type StepStatus = "complete" | "current" | "upcoming";

/**
 * Wizard progress indicator: numbered markers joined by connectors, with
 * completed steps ticked and clickable, the current one filled, upcoming
 * ones muted. Horizontal on desktop; on a phone it becomes a compact
 * counter + segmented track, because five labelled markers never fit in
 * 360px without truncating the very labels they exist to show. Vertical
 * orientation suits a side rail or a settings-style flow.
 *
 * Extracted from the ad-hoc steppers surveyed in consuming apps (a
 * horizontally scrolling `<ol>` of number bubbles; tab strips repurposed as
 * steps). Owns only the indicator — the step content and the Back/Next
 * buttons stay with the caller, whose form state decides what "next" means.
 */
export const Stepper = ({
  steps,
  activeStep,
  onStepChange,
  furthestStep,
  orientation = "horizontal",
  mobile = "compact",
  ariaLabel = "Progress",
  formatCounter = (n, total) => `Step ${n} of ${total}`,
  className,
}: StepperProps): ReactElement => {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === activeStep),
  );
  const furthestIndex = Math.max(
    activeIndex,
    steps.findIndex((s) => s.id === furthestStep),
  );
  const markerRefs = useRef(new Map<string, HTMLElement>());

  // Keep the active marker in view when the full list scrolls horizontally.
  useEffect(() => {
    const el = markerRefs.current.get(activeStep);
    el?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [activeStep]);

  const statusOf = (index: number): StepStatus =>
    index < activeIndex ? "complete" : index === activeIndex ? "current" : "upcoming";
  const isReachable = (index: number): boolean => Boolean(onStepChange) && index !== activeIndex && index <= furthestIndex;

  const vertical = orientation === "vertical";
  const compact = !vertical && mobile === "compact";
  const active = steps[activeIndex];
  const total = steps.length;
  const hasDescriptions = steps.some((s) => s.description);

  return (
    <nav aria-label={ariaLabel} className={cn("w-full", className)} data-orientation={orientation}>
      {compact && active && (
        // Phone bar: counter + label on one line, then a segmented track. The
        // <ol> below is the accessible source of truth; this is purely visual.
        <div className="flex flex-col gap-2 md:hidden" aria-hidden="true">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-semibold text-foreground">{active.label}</span>
            <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
              {formatCounter(activeIndex + 1, total)}
            </span>
          </div>
          <div className="flex gap-1">
            {steps.map((step, i) => {
              const status = statusOf(i);
              const reachable = isReachable(i);
              const segment = (
                <span
                  className={cn(
                    "block h-1 w-full rounded-full transition-colors",
                    step.error ? "bg-destructive" : status === "upcoming" ? "bg-muted-foreground/25" : "bg-primary",
                    status === "current" && !step.error && "bg-primary/80",
                  )}
                />
              );
              return reachable ? (
                <button
                  key={step.id}
                  type="button"
                  tabIndex={-1}
                  onClick={() => onStepChange?.(step.id)}
                  className="flex min-h-4 flex-1 items-center rounded-full"
                >
                  {segment}
                </button>
              ) : (
                <span key={step.id} className="flex min-h-4 flex-1 items-center">
                  {segment}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <ol
        className={cn(
          vertical ? "flex flex-col" : "flex items-start overflow-x-auto px-1 py-1 [scrollbar-width:none]",
          compact && "hidden md:flex",
        )}
      >
        {steps.map((step, i) => {
          const status = statusOf(i);
          const reachable = isReachable(i);
          const last = i === total - 1;
          const Icon = step.icon;

          const marker = (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-colors",
                step.error
                  ? "bg-destructive/12 text-destructive ring-1 ring-destructive/40 ring-inset dark:bg-destructive/20"
                  : status === "complete"
                    ? "bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground"
                    : status === "current"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground ring-1 ring-muted-foreground/25 ring-inset",
              )}
            >
              {step.error ? (
                <AlertCircle className="size-4" aria-hidden="true" />
              ) : status === "complete" ? (
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
              ) : Icon ? (
                <Icon className="size-3.5" />
              ) : (
                i + 1
              )}
            </span>
          );

          const text = (
            <span className={cn("flex min-w-0 flex-col", vertical ? "items-start text-left" : "items-center text-center")}>
              <span
                className={cn(
                  "text-xs font-medium leading-4 transition-colors",
                  step.error
                    ? "text-destructive"
                    : status === "current"
                      ? "font-semibold text-foreground"
                      : status === "complete"
                        ? "text-primary dark:text-foreground"
                        : "text-muted-foreground",
                  !vertical && "max-w-[7.5rem] [overflow-wrap:anywhere]",
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="text-[11px] leading-4 text-muted-foreground">{step.description}</span>
              )}
            </span>
          );

          const srStatus =
            status === "complete" ? " (completed)" : step.error ? " (needs attention)" : status === "upcoming" ? " (not yet available)" : "";

          const inner = (
            <>
              {marker}
              {text}
              <span className="sr-only">{srStatus}</span>
            </>
          );

          const itemClass = cn(
            "flex gap-2 rounded-lg transition-colors",
            vertical ? "flex-row items-start" : "flex-col items-center",
            vertical ? "min-w-0 py-0.5 pr-2" : "min-w-[4.5rem] px-1 py-1",
            reachable && "cursor-pointer hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          );

          const setRef = (el: HTMLElement | null): void => {
            if (el) markerRefs.current.set(step.id, el);
            else markerRefs.current.delete(step.id);
          };

          return (
            <li
              key={step.id}
              aria-current={status === "current" ? "step" : undefined}
              className={cn("flex", vertical ? "flex-col" : "flex-row items-start", !last && (vertical ? "" : "flex-1"))}
            >
              {reachable ? (
                <button ref={setRef} type="button" onClick={() => onStepChange?.(step.id)} className={itemClass}>
                  {inner}
                </button>
              ) : (
                <span ref={setRef} className={itemClass} aria-disabled={status === "upcoming" || undefined}>
                  {inner}
                </span>
              )}
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "transition-colors",
                    vertical
                      ? cn("my-1 ml-[calc(0.875rem-0.5px+0.25rem)] w-px flex-1", hasDescriptions ? "min-h-6" : "min-h-4")
                      : "mx-1 mt-[calc(0.25rem+0.875rem-0.5px)] h-px min-w-3 flex-1",
                    status === "complete" ? "bg-primary" : "bg-muted-foreground/25",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
