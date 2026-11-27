import { FunnelIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { Button } from "../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../lib/utils";

export interface FilterShellProps {
  columnId: string;
  /** The trigger button's accessible name. */
  ariaLabel: string;
  /** `true`: render the panel inline (filter bar / sidebar) instead of behind a popover trigger. */
  bare?: boolean;
  isFiltered: boolean;
  /** Text next to the icon while a filter is active. */
  summary: ReactNode;
  /** Tailwind `max-w-*` class of the trigger while it shows the summary. */
  maxWidthClass: string;
  /** Replaces the funnel (it dims while no filter is active). */
  icon?: ReactNode;
  contentClassName?: string;
  focusOnOpen?: (popup: HTMLElement) => HTMLElement | undefined;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/** The popover-or-inline frame every column filter widget shares; the widget supplies only the panel. */
export function FilterShell({
  columnId,
  ariaLabel,
  bare,
  isFiltered,
  summary,
  maxWidthClass,
  icon,
  contentClassName,
  focusOnOpen,
  open,
  onOpenChange,
  children,
}: FilterShellProps) {
  if (bare) {
    return <div data-testid={`filter-${columnId}`}>{children}</div>;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1", isFiltered ? `${maxWidthClass} px-2` : "w-8 justify-center px-0")}
          aria-label={ariaLabel}
          data-testid={`filter-${columnId}`}
        >
          {icon ?? (
            <FunnelIcon
              className={cn("h-3.5 w-3.5 shrink-0", isFiltered ? "opacity-100 text-primary dark:text-ring" : "opacity-60")}
              aria-hidden
            />
          )}
          {isFiltered && <span className="truncate">{summary}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={contentClassName} focusOnOpen={focusOnOpen}>
        {children}
      </PopoverContent>
    </Popover>
  );
}
