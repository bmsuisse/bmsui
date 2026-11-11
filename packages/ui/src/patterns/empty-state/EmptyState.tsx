import { FunnelIcon } from "@heroicons/react/24/outline";
import type { ComponentType, HTMLAttributes, ReactElement, ReactNode, SVGProps } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../../primitives/button";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  /** Secondary line under the title: why it's empty or what to do next. */
  description?: ReactNode;
  /** Heroicon-style component shown in a muted round tile above the title. Omit for text only. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** A reset-filters or "New …" button rendered under the text. */
  action?: ReactNode;
  /** `md` (default) for a whole panel or list; `sm` for an empty card section ("no tasks"). */
  size?: "sm" | "md";
  /** Grow to fill a flex parent and center vertically in it. */
  fill?: boolean;
  /**
   * The icon tile fades and rises 4px into place once on mount (200ms ease-out,
   * fade only under reduced motion). `false` renders it static. @default true
   */
  animated?: boolean;
}

/**
 * "Nothing here" placeholder: optional icon, title, description and action.
 * Use it for a list, table or panel with no data; use `ErrorState` when loading failed
 * and `FilteredEmptyState` when filters hide every row.
 */
export const EmptyState = ({
  title,
  description,
  icon: Icon,
  action,
  size = "md",
  fill = false,
  animated = true,
  className,
  ...props
}: EmptyStateProps): ReactElement => {
  const sm = size === "sm";
  return (
    <div
      data-testid="empty-state"
      className={cn(
        "flex flex-col items-center text-center",
        sm ? "gap-1 px-4 py-5" : "gap-1 px-6 py-10",
        fill && "min-h-0 flex-1 justify-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        // bg-muted alone is near-invisible on the light surface (#f8f8f8 on #fcfcfc), so the
        // tile gets a hairline ring and a faint foreground tint that reads in both modes.
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-foreground/[0.04] ring-1 ring-inset ring-foreground/10 dark:bg-foreground/[0.06]",
            sm ? "mb-1 h-8 w-8" : "mb-2 h-11 w-11",
            // One-shot entrance via @starting-style: no keyframes, no JS.
            animated &&
              "transition-[opacity,translate] duration-200 ease-out starting:opacity-0 motion-safe:starting:translate-y-1 motion-reduce:transition-opacity",
          )}
        >
          <Icon aria-hidden="true" className={cn("text-muted-foreground", sm ? "h-4 w-4" : "h-5 w-5")} />
        </div>
      ) : null}
      <p className={cn("text-balance font-semibold text-foreground", sm ? "text-xs" : "text-sm")}>{title}</p>
      {description ? (
        <p className={cn("max-w-sm text-balance text-muted-foreground", sm ? "text-xs" : "text-sm")}>{description}</p>
      ) : null}
      {action ? <div className={cn("flex flex-wrap justify-center gap-2", sm ? "mt-2" : "mt-3")}>{action}</div> : null}
    </div>
  );
};

export interface FilteredEmptyStateLabels {
  title: string;
  description: string;
  reset: string;
}

export const defaultFilteredEmptyStateLabels: FilteredEmptyStateLabels = {
  title: "No results",
  description: "Nothing matches the current search or filters.",
  reset: "Reset filters",
};

export interface FilteredEmptyStateProps extends Omit<EmptyStateProps, "title" | "description" | "action"> {
  /** Clears search and filters. */
  onReset: () => void;
  labels?: Partial<FilteredEmptyStateLabels>;
}

/** Empty state for a filtered list or table: says nothing matches and offers a way back with a Reset button. */
export const FilteredEmptyState = ({
  onReset,
  labels,
  icon = FunnelIcon,
  size,
  ...props
}: FilteredEmptyStateProps): ReactElement => {
  const l = { ...defaultFilteredEmptyStateLabels, ...labels };
  // OneSales tests target `<testid>-reset`; derive it from the root's data-testid.
  const rootTestId = (props as Record<string, unknown>)["data-testid"];
  return (
    <EmptyState
      icon={icon}
      size={size}
      title={l.title}
      description={l.description}
      action={
        <Button
          type="button"
          variant="outline"
          size={size === "sm" ? "xs" : "sm"}
          onClick={onReset}
          data-testid={typeof rootTestId === "string" ? `${rootTestId}-reset` : undefined}
        >
          {l.reset}
        </Button>
      }
      {...props}
    />
  );
};
