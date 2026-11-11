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
  className,
  ...props
}: EmptyStateProps): ReactElement => {
  const sm = size === "sm";
  return (
    <div
      data-testid="empty-state"
      className={cn(
        "flex flex-col items-center text-center",
        sm ? "gap-1 px-4 py-4" : "gap-1.5 px-6 py-8",
        fill && "min-h-0 flex-1 justify-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <div
          className={cn(
            "mb-1 flex items-center justify-center rounded-full bg-muted",
            sm ? "h-8 w-8" : "h-12 w-12",
          )}
        >
          <Icon aria-hidden="true" className={cn("text-muted-foreground", sm ? "h-4 w-4" : "h-6 w-6")} />
        </div>
      ) : null}
      <p className={cn("font-semibold text-foreground", sm ? "text-xs" : "text-sm")}>{title}</p>
      {description ? (
        <p className={cn("max-w-prose text-muted-foreground", sm ? "text-xs" : "text-sm")}>{description}</p>
      ) : null}
      {action ? <div className="mt-2 flex justify-center gap-2">{action}</div> : null}
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
