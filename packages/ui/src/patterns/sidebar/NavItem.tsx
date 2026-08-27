import type { ComponentPropsWithoutRef, ElementType, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../primitives/tooltip";
import { useSidebarCollapsed } from "./context";

/** Shape a `lucide-react` icon component satisfies — `NavItem` sizes and colors it itself. */
export interface NavIconProps {
  className?: string;
  strokeWidth?: string | number;
  "aria-hidden"?: boolean | "true" | "false";
}

export type NavItemProps<T extends ElementType = "a"> = {
  /** The element (or router `Link`) this renders as, e.g. `as={Link} to="/overview"`. @default "a" */
  as?: T;
  icon?: ElementType<NavIconProps>;
  label: ReactNode;
  /** Highlights this row as the current page. The caller computes this from its own router — `NavItem` has no router opinion. */
  active?: boolean;
  /** Rendered after the label, and again in the collapsed-rail tooltip — e.g. an experimental-status `Badge`. */
  badge?: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

/**
 * One row inside a `Sidebar`/`NavGroup`. Polymorphic via `as` so it renders a
 * plain `<a>` by default or a router's own `Link` (extra props like `to`/
 * `href` pass straight through). When the nearest `Sidebar` is rail-
 * collapsed, the row shrinks to icon-only and shows `label`/`badge` in a
 * hover tooltip instead.
 */
export function NavItem<T extends ElementType = "a">({
  as,
  icon: Icon,
  label,
  active = false,
  badge,
  className,
  ...rest
}: NavItemProps<T>): ReactElement {
  const collapsed = useSidebarCollapsed();
  const Comp = (as ?? "a") as ElementType;

  const row = (
    <Comp
      className={cn(
        "group relative flex items-center rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none",
        collapsed ? "justify-center gap-0" : "gap-2.5",
        active
          ? "bg-nav-primary/8 font-semibold text-foreground"
          : "text-foreground/55 hover:bg-muted/60 hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {Icon && (
        <Icon
          className={cn("h-[18px] w-[18px] shrink-0", active ? "text-nav-primary" : "text-muted-foreground")}
          strokeWidth={active ? 2 : 1.75}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "truncate transition-[opacity,max-width] duration-150",
          collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100",
        )}
      >
        {label}
      </span>
      {!collapsed && badge}
    </Comp>
  );

  if (!collapsed) return row;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-1.5">
        {label}
        {badge}
      </TooltipContent>
    </Tooltip>
  );
}
