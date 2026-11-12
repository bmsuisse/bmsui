import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { badgeVariants } from "../../primitives/badge";
import { Button, type ButtonProps } from "../../primitives/button";
import { ResponsivePanel, type ResponsivePanelSize } from "../modal/ResponsivePanel";

export interface FilterSheetLabels {
  title: string;
  apply: string;
  /** Primary button text once `resultCount` is known: "Show 128 results". */
  applyWithCount: (count: number) => string;
  reset: string;
  /** Description under the title while filters are active. */
  activeCount: (count: number) => string;
}

export const defaultFilterSheetLabels: FilterSheetLabels = {
  title: "Filters",
  apply: "Apply",
  applyWithCount: (count) => `Show ${count} ${count === 1 ? "result" : "results"}`,
  reset: "Reset",
  activeCount: (count) => `${count} active`,
};

export interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The filter controls, e.g. a `FacetFilter`. */
  children: ReactNode;
  /**
   * How many results the current selection gives. The primary button then reads "Show 128 results"
   * and (like Apply) closes the sheet; it also appears in live mode, where it just closes.
   */
  resultCount?: number;
  /** Number of active filters; shown under the title and enables Reset. */
  activeCount?: number;
  /**
   * Called by Apply, which then closes the sheet. Omit it when filters apply
   * live as they're changed: the footer then only has Reset (and Done closes via the panel's own close button).
   */
  onApply?: () => void;
  onReset?: () => void;
  applyDisabled?: boolean;
  size?: ResponsivePanelSize;
  /** `matchMedia` query for the desktop dialog; below it the sheet is a bottom drawer. */
  breakpoint?: string;
  labels?: Partial<FilterSheetLabels>;
  className?: string;
}

/**
 * Filters in a bottom-sheet on phones (dialog on desktop) with Reset and
 * Apply in the footer. Chrome only: it holds no draft state, so for an
 * Apply button keep the draft selection in the caller and commit it in
 * `onApply`. Re-seed that draft from the applied value whenever the sheet
 * opens: closing via X/Esc/backdrop leaves the abandoned draft untouched. Pair with `FilterSheetTrigger` for the button that opens it.
 */
export const FilterSheet = ({
  open,
  onOpenChange,
  children,
  activeCount = 0,
  resultCount,
  onApply,
  onReset,
  applyDisabled,
  size = "md",
  breakpoint,
  labels: labelOverrides,
  className,
}: FilterSheetProps): ReactElement => {
  const labels = { ...defaultFilterSheetLabels, ...labelOverrides };
  return (
    <ResponsivePanel
      open={open}
      onOpenChange={onOpenChange}
      title={labels.title}
      description={activeCount > 0 ? labels.activeCount(activeCount) : undefined}
      size={size}
      breakpoint={breakpoint}
      className={className}
      footer={
        onReset || onApply || resultCount !== undefined ? (
        <div className="flex w-full gap-2 max-lg:[&>button]:h-11 max-lg:[&>button]:flex-1 lg:justify-end">
          {onReset && (
            <Button type="button" variant="outline" disabled={activeCount === 0} onClick={onReset}>
              {labels.reset}
            </Button>
          )}
          {(onApply || resultCount !== undefined) && (
            <Button
              type="button"
              disabled={applyDisabled}
              onClick={() => {
                onApply?.();
                onOpenChange(false);
              }}
            >
              {resultCount !== undefined ? labels.applyWithCount(resultCount) : labels.apply}
            </Button>
          )}
        </div>
        ) : undefined
      }
    >
      {children}
    </ResponsivePanel>
  );
};

export interface FilterSheetTriggerProps extends Omit<ButtonProps, "children"> {
  /** Number of active filters, shown as a badge (hidden at 0). */
  activeCount?: number;
  labels?: Partial<Pick<FilterSheetLabels, "title" | "activeCount">>;
  children?: ReactNode;
}

/** The "Filters (3)" button that opens a {@link FilterSheet}. */
export const FilterSheetTrigger = ({
  activeCount = 0,
  labels: labelOverrides,
  children,
  className,
  variant = "outline",
  ...props
}: FilterSheetTriggerProps): ReactElement => {
  const labels = { ...defaultFilterSheetLabels, ...labelOverrides };
  return (
    <Button
      type="button"
      aria-haspopup="dialog"
      variant={variant}
      className={cn("gap-2", className)}
      {...props}
    >
      <AdjustmentsHorizontalIcon aria-hidden="true" />
      {children ?? labels.title}
      {activeCount > 0 && (
        <>
          <span aria-hidden="true" className={cn(badgeVariants({ variant: "secondary" }), "px-1.5 py-0 tabular-nums")}>
            {activeCount}
          </span>
          <span className="sr-only">{labels.activeCount(activeCount)}</span>
        </>
      )}
    </Button>
  );
};
