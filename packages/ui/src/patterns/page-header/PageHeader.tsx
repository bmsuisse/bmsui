import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { ElementType, HTMLAttributes, ReactElement, ReactNode } from "react";
import { useRef } from "react";
import { slidingIndicatorClass, useSlidingIndicator } from "../../lib/useSlidingIndicator";
import { cn } from "../../lib/utils";

export type PageHeaderBadge = "alpha" | "beta" | "dev";

export interface PageHeaderLabels {
  /** Accessible name of the back button/link. */
  back: string;
}

export const defaultPageHeaderLabels: PageHeaderLabels = { back: "Back" };

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  /** One line under the title: what this page is for. */
  description?: ReactNode;
  /** Buttons/controls on the right. They wrap below the title on narrow screens. */
  actions?: ReactNode;
  /** Small pill after the title: `"alpha"`, `"beta"`, `"dev"` or any node. */
  badge?: PageHeaderBadge | ReactNode;
  /** Renders a back arrow before the title that calls this. */
  onBack?: () => void;
  /** Renders the back arrow as a link to this URL (ignored when `onBack` is set). */
  backHref?: string;
  /** Breadcrumb trail above the title, usually a `<Breadcrumbs>`. */
  breadcrumbs?: ReactNode;
  /** Row under the title, usually a `TabsList` or a row of nav links. */
  tabs?: ReactNode;
  /** Bottom hairline under the header (or under the tabs row). @default false */
  divider?: boolean;
  /** Heading element for the title. @default "h1" */
  titleAs?: ElementType;
  labels?: Partial<PageHeaderLabels>;
  /**
   * When `tabs` is a Radix `TabsList`, one shared pill slides to the active tab
   * (150ms ease-out, instant under reduced motion) instead of the active
   * trigger's own background jumping. @default true
   */
  animated?: boolean;
}

const badgeTone: Record<PageHeaderBadge, string> = {
  alpha: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  beta: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  dev: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
};

function isBadgeKey(value: unknown): value is PageHeaderBadge {
  return value === "alpha" || value === "beta" || value === "dev";
}

/**
 * The top of a page: optional breadcrumbs, a back arrow, title (+ badge),
 * description, right-aligned actions and an optional tabs row. Use it once per
 * page, above the content; for a table/list page reach for `TablePage`, which
 * puts this on top of a `TableShell`. Same props as OneSales's
 * `ui/PageHeader` (`title`, `badge`, `description`, `actions`, `onBack`), but
 * it renders inline instead of publishing into an app-shell store.
 */
export function PageHeader({
  title,
  description,
  actions,
  badge,
  onBack,
  backHref,
  breadcrumbs,
  tabs,
  divider = false,
  titleAs: Title = "h1",
  labels,
  animated = true,
  className,
  ...props
}: PageHeaderProps): ReactElement {
  const l = { ...defaultPageHeaderLabels, ...labels };
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  useSlidingIndicator(tabsRef, pillRef, '[role="tab"][data-state="active"]', animated && !!tabs, [tabs]);
  const backClass =
    "-ml-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-foreground/10";
  const back = onBack ? (
    <button type="button" onClick={onBack} aria-label={l.back} title={l.back} data-testid="page-header-back" className={backClass}>
      <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
    </button>
  ) : backHref ? (
    <a href={backHref} aria-label={l.back} title={l.back} data-testid="page-header-back" className={backClass}>
      <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
    </a>
  ) : null;

  return (
    <header
      data-testid="page-header"
      className={cn(
        "flex min-w-0 flex-col gap-3",
        divider && !tabs && "border-b border-foreground/10 pb-5 dark:border-border",
        className,
      )}
      {...props}
    >
      {breadcrumbs ? <div className="min-w-0">{breadcrumbs}</div> : null}
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-[1_1_16rem] items-start gap-2">
          {back}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-x-2 gap-y-1 max-sm:flex-wrap">
              <Title
                data-testid="page-header-title"
                className="line-clamp-2 min-w-0 break-words text-xl/8 font-semibold tracking-tight text-foreground sm:line-clamp-1"
              >
                {title}
              </Title>
              {badge ? (
                isBadgeKey(badge) ? (
                  <span
                    data-testid="page-header-badge"
                    className={cn(
                      "inline-flex h-5 shrink-0 items-center rounded-full border px-1.5 text-[10px] font-semibold uppercase leading-none tracking-wider",
                      badgeTone[badge],
                    )}
                  >
                    {badge}
                  </span>
                ) : (
                  <span data-testid="page-header-badge" className="inline-flex shrink-0 items-center">
                    {badge}
                  </span>
                )
              ) : null}
            </div>
            {description ? (
              <p data-testid="page-header-description" className="max-w-prose text-sm/6 text-pretty text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div data-testid="page-header-actions" className="flex max-w-full min-h-8 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {tabs ? (
        <div
          ref={tabsRef}
          data-testid="page-header-tabs"
          className={cn(
            "relative -mx-1 mt-1 min-w-0 overflow-x-auto px-1 pb-px",
            // While the sliding pill is placed, triggers sit above it and drop their own active surface.
            "[&_[role=tab]]:relative [&[data-indicator]_[role=tab][data-state=active]]:bg-transparent [&[data-indicator]_[role=tab][data-state=active]]:shadow-none",
            divider && "border-b border-foreground/10 pb-2 dark:border-border",
          )}
        >
          <span
            ref={pillRef}
            aria-hidden="true"
            className={cn(slidingIndicatorClass, "rounded-md bg-background shadow-sm")}
          />
          {tabs}
        </div>
      ) : null}
    </header>
  );
}
