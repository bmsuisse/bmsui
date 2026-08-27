import { ChevronDown } from "lucide-react";
import { useState, type ReactElement, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { useSidebarCollapsed } from "./context";

export interface NavGroupProps {
  /** Section header. Omit for a flat group with no header/collapse affordance. */
  label?: ReactNode;
  /** Uncontrolled starting collapsed state. @default false */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children: ReactNode;
  className?: string;
}

/**
 * A labeled, independently collapsible section of `NavItem`s inside a
 * `Sidebar`. This group's own collapsed state (items hidden/shown) is
 * separate from the sidebar's rail-collapse: when the sidebar itself is
 * rail-collapsed, this group's header shrinks to a thin divider (its items
 * stay visible as icons) rather than disappearing, since there's no room for
 * a clickable label to toggle.
 */
export function NavGroup({
  label,
  defaultCollapsed = false,
  collapsed,
  onCollapsedChange,
  children,
  className,
}: NavGroupProps): ReactElement {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const groupCollapsed = collapsed ?? internalCollapsed;
  const railCollapsed = useSidebarCollapsed();

  const setGroupCollapsed = (next: boolean) => {
    onCollapsedChange?.(next);
    if (collapsed === undefined) setInternalCollapsed(next);
  };

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {label &&
        (railCollapsed ? (
          <div className="mx-2 my-1 h-px bg-border/50" aria-hidden />
        ) : (
          <button
            type="button"
            onClick={() => setGroupCollapsed(!groupCollapsed)}
            aria-expanded={!groupCollapsed}
            className="group flex w-full items-center justify-between px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/80 hover:text-foreground"
          >
            <span>{label}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 opacity-40 transition-transform group-hover:opacity-100",
                groupCollapsed && "-rotate-90",
              )}
              aria-hidden
            />
          </button>
        ))}
      {!groupCollapsed && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}
