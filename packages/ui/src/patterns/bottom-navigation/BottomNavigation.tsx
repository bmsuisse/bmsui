import type { ComponentType, HTMLAttributes, MouseEvent, ReactElement, ReactNode, SVGProps } from "react";
import { forwardRef, useState } from "react";
import { cn } from "../../lib/utils";

export interface BottomNavigationItem {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** A number (capped by `maxBadge`), a short string, or `true` for a bare dot. */
  badge?: number | string | boolean;
  disabled?: boolean;
  /** Renders a link (`<a>`, or your router link through `renderLink`) instead of a button. */
  href?: string;
  onClick?: () => void;
  "data-testid"?: string;
}

export interface BottomNavigationLinkRenderProps {
  href: string;
  className: string;
  children: ReactNode;
  item: BottomNavigationItem;
  "aria-current"?: "page";
  "aria-disabled"?: true;
  tabIndex?: number;
  onClick: (event: MouseEvent<HTMLElement>) => void;
}

export interface BottomNavigationLabels {
  /** Screen-reader text appended to a badge, e.g. "3 new". */
  badge: (badge: number | string) => string;
  /** Screen-reader text for a bare dot badge (`badge: true`). */
  dot: string;
}

export const defaultBottomNavigationLabels: BottomNavigationLabels = {
  badge: (badge) => `${badge} new`,
  dot: "New",
};

const HIDE_FROM = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
} as const;

const POSITION = {
  fixed: "fixed inset-x-0 bottom-0 z-40",
  sticky: "sticky bottom-0 z-40",
  static: "relative",
} as const;

export interface BottomNavigationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
  items: BottomNavigationItem[];
  /** Id of the current destination (controlled). `null` = none; omit for uncontrolled. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string) => void;
  /** Centre slot between the items, typically a `BottomNavigationAction`. */
  action?: ReactNode;
  /** `fixed` (default) pins to the viewport bottom: reserve space for it (at least 72px + safe area; taller with large text). */
  position?: keyof typeof POSITION;
  /** Hide from this breakpoint up, for a nav that is phone-only. Default: always shown. */
  hideFrom?: keyof typeof HIDE_FROM | false;
  /** Largest number shown in a badge before it reads "99+". */
  maxBadge?: number;
  /** Render links with your router (`<Link to={href}>`) instead of a plain `<a>`. */
  renderLink?: (props: BottomNavigationLinkRenderProps) => ReactNode;
  labels?: Partial<BottomNavigationLabels>;
  /** Fades the active pill in and out. Default true. */
  animated?: boolean;
  "aria-label": string;
}

function badgeText(badge: number | string | boolean | undefined, max: number): string | null {
  if (badge === undefined || badge === false || badge === 0 || badge === "") return null;
  if (badge === true) return "";
  if (typeof badge === "number") return badge > max ? `${max}+` : String(badge);
  return badge;
}

/**
 * Phone tab bar: 2–5 destinations with icon, label and badge, an optional centre action, safe-area
 * padding and 44px+ tap targets. The current item carries `aria-current="page"`. Extracted from
 * OneSales's `MobileTabBar` without its routes, sheets or keyboard-hiding logic.
 */
export const BottomNavigation = forwardRef<HTMLElement, BottomNavigationProps>(function BottomNavigation(
  {
    items,
    value,
    defaultValue = null,
    onValueChange,
    action,
    position = "fixed",
    hideFrom = false,
    maxBadge = 99,
    renderLink,
    labels,
    animated = true,
    className,
    ...props
  },
  ref,
) {
  const l = { ...defaultBottomNavigationLabels, ...labels };
  const [inner, setInner] = useState<string | null>(defaultValue);
  const current = value !== undefined ? value : inner;
  const half = Math.ceil(items.length / 2);
  const dense = items.length + (action ? 1 : 0) >= 5;

  const renderItem = (item: BottomNavigationItem): ReactElement => {
    const active = item.id === current;
    const text = badgeText(item.badge, maxBadge);
    const Icon = item.icon;
    const cls = cn(
      "group flex h-full min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-md px-0.5 outline-none",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
      "active:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-50 disabled:pointer-events-none disabled:opacity-50",
    );
    const content = (
      <>
        <span
          className={cn(
            "relative flex h-8 w-14 max-w-full items-center justify-center rounded-[var(--radius-pill,9999px)]",
            animated && "transition-colors duration-150 ease-out motion-reduce:transition-none",
            active && "bg-primary/10 dark:bg-ring/20",
          )}
        >
          <Icon
            aria-hidden
            strokeWidth={active ? 2 : 1.6}
            className={cn(
              "size-[26px]",
              animated && "transition-colors duration-150 motion-reduce:transition-none",
              active ? "text-primary dark:text-ring" : "text-muted-foreground",
            )}
          />
          {text !== null &&
            (text === "" ? (
              <span aria-hidden className="absolute top-0 left-[calc(50%+9px)] size-2.5 rounded-full bg-red-600 ring-2 ring-background" />
            ) : (
              <span
                aria-hidden
                className="absolute -top-1 left-[calc(50%+6px)] flex h-[18px] min-w-[18px] items-center justify-center rounded-[var(--radius-pill,9999px)] bg-red-700 px-1 text-[11px] leading-none font-semibold text-white tabular-nums ring-2 ring-background"
              >
                {text}
              </span>
            ))}
        </span>
        <span
          className={cn(
            "line-clamp-2 max-w-full text-center leading-[14px] [overflow-wrap:anywhere] hyphens-auto",
            dense ? "text-[11px]" : "text-[13px]",
            active ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
          )}
        >
          {item.label}
        </span>
        {text !== null && <span className="sr-only">{item.badge === true ? l.dot : l.badge(item.badge as number | string)}</span>}
      </>
    );
    const select = (event: MouseEvent<HTMLElement>): void => {
      if (item.disabled) {
        event.preventDefault();
        return;
      }
      item.onClick?.();
      if (value === undefined) setInner(item.id);
      onValueChange?.(item.id);
    };

    if (item.href) {
      const linkProps: BottomNavigationLinkRenderProps = {
        href: item.href,
        className: cls,
        children: content,
        item,
        "aria-current": active ? "page" : undefined,
        "aria-disabled": item.disabled ? true : undefined,
        tabIndex: item.disabled ? -1 : undefined,
        onClick: select,
      };
      return (
        <li key={item.id} className="flex h-full min-w-0 flex-1">
          {renderLink ? (
            renderLink(linkProps)
          ) : (
            <a
              href={item.href}
              className={cls}
              aria-current={linkProps["aria-current"]}
              aria-disabled={linkProps["aria-disabled"]}
              tabIndex={linkProps.tabIndex}
              onClick={select}
              data-testid={item["data-testid"]}
            >
              {content}
            </a>
          )}
        </li>
      );
    }
    return (
      <li key={item.id} className="flex h-full min-w-0 flex-1">
        <button
          type="button"
          className={cls}
          disabled={item.disabled}
          aria-current={active ? "page" : undefined}
          onClick={select}
          data-testid={item["data-testid"]}
        >
          {content}
        </button>
      </li>
    );
  };

  return (
    <nav
      ref={ref}
      data-slot="bottom-navigation"
      className={cn(
        POSITION[position],
        "border-t border-foreground/10 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-border",
        hideFrom && HIDE_FROM[hideFrom],
        className,
      )}
      {...props}
    >
      <ul className="m-0 flex min-h-[72px] list-none items-stretch p-0">
        {items.slice(0, half).map(renderItem)}
        {action && <li className="flex shrink-0 items-center justify-center px-2">{action}</li>}
        {items.slice(half).map(renderItem)}
      </ul>
    </nav>
  );
});
BottomNavigation.displayName = "BottomNavigation";

export interface BottomNavigationActionProps extends HTMLAttributes<HTMLButtonElement> {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Accessible name (the button is icon-only). */
  label: string;
  disabled?: boolean;
  "data-testid"?: string;
}

/** The round primary button for `BottomNavigation`'s centre `action` slot ("+", quick actions). */
export const BottomNavigationAction = forwardRef<HTMLButtonElement, BottomNavigationActionProps>(function BottomNavigationAction(
  { icon: Icon, label, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "flex size-[52px] shrink-0 touch-manipulation items-center justify-center rounded-[var(--radius-pill,9999px)] bg-primary text-primary-foreground shadow-sm outline-none transition-colors active:opacity-80",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden strokeWidth={2.25} className="size-7" />
    </button>
  );
});
BottomNavigationAction.displayName = "BottomNavigationAction";
