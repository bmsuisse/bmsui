import { useEffect, useRef } from "react";
import { CheckIcon, PlusIcon } from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";

/** The minimal shape this component needs to render one chip in the stepper. */
export interface StepperStep {
  /** 1-based step number, also used as the React key and navigation target. */
  n: number;
  /** Visible label under the chip. */
  label: string;
  /** Small uppercase caption under the label (e.g. a phase/section name). */
  phase: string;
}

export interface StepperProps {
  /** The current step number (1-based, matches a `StepperStep.n`). */
  step: number;
  /** Highest step number reachable so far -- steps beyond this aren't clickable. */
  maxStep: number;
  /** Called with a step's `n` when a navigable chip is clicked. */
  onNavigate: (n: number) => void;
  /** Called when the trailing "new" button is clicked. Omit to hide that button entirely. */
  onNew?: () => void;
  /** The steps to render, in order. */
  steps: StepperStep[];
  /** Accessible label for the stepper's `<nav>`. @default "Steps" */
  navLabel?: string;
  /** Visible text and title of the trailing `onNew` button. Only relevant when `onNew` is passed. @default "New" */
  newLabel?: string;
  /** `data-testid` for the horizontally-scrolling steps region. @default "stepper-scroll" */
  scrollTestId?: string;
  /** `data-testid` for the trailing `onNew` button, when rendered. */
  newTestId?: string;
}

/**
 * Numbered-chip wizard progress indicator: a horizontally-scrolling row of
 * step chips (done/active/upcoming, connected by a line that fills in as
 * steps complete) plus an optional trailing "start over" button. Replaces
 * the same shape hand-rolled independently by more than one multi-step
 * wizard.
 *
 * Note: the original OneSales `Stepper` this was ported from also supported
 * a one-off `tinderSubStep` prop that injected a bespoke "matcher" chip
 * between two specific steps for a single screen's own sub-flow. That was
 * deliberately left out of this generic version -- it doesn't generalize
 * meaningfully beyond that one screen. Don't re-add it here; a consumer
 * that needs a one-off extra chip should compose its own around this
 * component instead.
 */
export function Stepper({
  step,
  maxStep,
  onNavigate,
  onNew,
  steps,
  navLabel = "Steps",
  newLabel = "New",
  scrollTestId = "stepper-scroll",
  newTestId,
}: StepperProps) {
  const stepRefs = useRef(new Map<number, HTMLButtonElement>());

  useEffect(() => {
    const activeStep = stepRefs.current.get(step);
    activeStep?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [step]);

  return (
    // onNew is pinned outside the horizontally-scrolling region below (a sibling of
    // it, not a child) so its own edge never scrolls off-screen along with the
    // later steps once the scroller's min-width doesn't fit the viewport.
    <div className="flex w-full shrink-0 items-center gap-2">
      <nav aria-label={navLabel} className="min-w-0 flex-1">
        <div
          data-testid={scrollTestId}
          className="flex w-full items-center gap-0 overflow-x-auto px-2 py-1"
        >
          <ol className="flex min-w-[700px] flex-1 items-start">
            {steps.map(({ n, label, phase }, i) => {
              const done = step > n;
              const active = step === n;
              const navigable = n <= maxStep && n !== step;
              const last = i === steps.length - 1;
              return (
                <li key={n} className={cn("flex items-start", !last && "flex-1")}>
                  <button
                    ref={(element) => {
                      if (element) stepRefs.current.set(n, element);
                      else stepRefs.current.delete(n);
                    }}
                    data-testid={`step-${n}`}
                    aria-disabled={!navigable}
                    aria-current={active ? "step" : undefined}
                    onClick={() => navigable && onNavigate(n)}
                    className={cn(
                      "flex min-w-[68px] flex-col items-center gap-0.5 transition-opacity",
                      navigable ? "cursor-pointer hover:opacity-80" : "cursor-default",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                        done
                          ? "bg-primary/15 text-primary"
                          : active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? <CheckIcon className="h-3 w-3" /> : n}
                    </div>
                    <span
                      className={cn(
                        "text-center whitespace-nowrap transition-colors",
                        active
                          ? "text-[12px] font-semibold text-foreground"
                          : done
                            ? "text-[12px] font-medium text-primary"
                            : "text-[12px] font-medium text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                    <span className="text-[9px] tracking-[0.5px] text-muted-foreground/50 uppercase">
                      {phase}
                    </span>
                  </button>
                  {!last && (
                    <div
                      className={cn(
                        "mx-1.5 mt-3.5 h-px flex-1 transition-colors",
                        done ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
      {onNew && (
        <button
          data-testid={newTestId}
          onClick={onNew}
          title={newLabel}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {newLabel}
        </button>
      )}
    </div>
  );
}
