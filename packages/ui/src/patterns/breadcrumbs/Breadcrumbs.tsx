import { ChevronRightIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import type { ComponentType, HTMLAttributes, ReactElement, ReactNode, SVGProps } from "react";
import { Fragment } from "react";
import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";

export interface BreadcrumbItem {
  label: ReactNode;
  /** Link target. Rendered through `renderLink` when given, a plain `<a>` otherwise. */
  href?: string;
  /** Click handler for items without a URL (in-app navigation). */
  onClick?: () => void;
  /** Small heroicon before the label (e.g. a home icon on the first crumb). */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface BreadcrumbLinkRenderProps {
  href: string;
  className: string;
  children: ReactNode;
  item: BreadcrumbItem;
}

export interface BreadcrumbsLabels {
  /** Accessible name of the `<nav>` landmark. */
  nav: string;
  /** Accessible name of the "…" button that lists the collapsed crumbs. */
  more: string;
}

export const defaultBreadcrumbsLabels: BreadcrumbsLabels = {
  nav: "Breadcrumb",
  more: "Show hidden breadcrumbs",
};

export interface BreadcrumbsProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Root first, current page last. The last item is the current page (`aria-current="page"`, not a link). */
  items: BreadcrumbItem[];
  /** Collapse the middle crumbs into a "…" menu once there are more than this many. @default 4 */
  maxItems?: number;
  /** Crumbs kept visible before the "…" when collapsed. @default 1 */
  itemsBeforeCollapse?: number;
  /** Crumbs kept visible after the "…" when collapsed (including the current page). @default 2 */
  itemsAfterCollapse?: number;
  /** Rendered between crumbs. Defaults to a small chevron. */
  separator?: ReactNode;
  /** Render links with your router (`<Link to={href}>`) instead of a plain `<a>`. */
  renderLink?: (props: BreadcrumbLinkRenderProps) => ReactNode;
  labels?: Partial<BreadcrumbsLabels>;
}

const linkClass =
  "inline-flex min-w-0 items-center gap-1.5 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Where-am-I trail above a page title: `nav` > `ol` with the current page last.
 * Use it on detail pages more than one level deep; for a single "back to list"
 * hop, `PageHeader`'s `onBack`/`backHref` is enough. Long trails collapse their
 * middle into a "…" dropdown (`maxItems`).
 */
export function Breadcrumbs({
  items,
  maxItems = 4,
  itemsBeforeCollapse = 1,
  itemsAfterCollapse = 2,
  separator,
  renderLink,
  labels,
  className,
  ...props
}: BreadcrumbsProps): ReactElement {
  const l = { ...defaultBreadcrumbsLabels, ...labels };
  const collapse =
    items.length > maxItems && itemsBeforeCollapse + itemsAfterCollapse < items.length && itemsAfterCollapse > 0;
  const before = collapse ? items.slice(0, itemsBeforeCollapse) : items;
  const hidden = collapse ? items.slice(itemsBeforeCollapse, items.length - itemsAfterCollapse) : [];
  const after = collapse ? items.slice(items.length - itemsAfterCollapse) : [];
  const lastIndex = items.length - 1;

  const sep = (
    <li role="presentation" aria-hidden="true" className="flex shrink-0 items-center text-muted-foreground/50">
      {separator ?? <ChevronRightIcon className="h-3.5 w-3.5" />}
    </li>
  );

  const renderCrumb = (item: BreadcrumbItem, index: number): ReactElement => {
    const Icon = item.icon;
    const content = (
      <>
        {Icon ? <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> : null}
        <span className="truncate">{item.label}</span>
      </>
    );
    let node: ReactNode;
    if (index === lastIndex) {
      node = (
        <span aria-current="page" className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground">
          {content}
        </span>
      );
    } else if (item.href) {
      node = renderLink ? (
        renderLink({ href: item.href, className: linkClass, children: content, item })
      ) : (
        <a href={item.href} onClick={item.onClick} className={linkClass}>
          {content}
        </a>
      );
    } else if (item.onClick) {
      node = (
        <button type="button" onClick={item.onClick} className={linkClass}>
          {content}
        </button>
      );
    } else {
      node = <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">{content}</span>;
    }
    return (
      <li
        key={index}
        data-testid="breadcrumbs-item"
        className={cn("flex min-w-0 items-center", index === lastIndex ? "max-w-[24ch] shrink sm:max-w-[40ch]" : "max-w-[12ch] shrink-0 sm:max-w-[24ch]")}
      >
        {node}
      </li>
    );
  };

  return (
    <nav aria-label={l.nav} data-testid="breadcrumbs" className={cn("min-w-0", className)} {...props}>
      <ol className="flex min-w-0 items-center gap-1.5 text-[13px] leading-5">
        {before.map((item, i) => (
          <Fragment key={`b-${i}`}>
            {i > 0 ? sep : null}
            {renderCrumb(item, i)}
          </Fragment>
        ))}
        {collapse ? (
          <>
            {sep}
            <li className="flex shrink-0 items-center">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={l.more}
                  data-testid="breadcrumbs-more"
                  className="inline-flex h-5 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground dark:hover:bg-foreground/10 dark:data-[state=open]:bg-foreground/10"
                >
                  <EllipsisHorizontalIcon className="h-4 w-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="origin-[var(--radix-dropdown-menu-content-transform-origin)] transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0 motion-reduce:starting:scale-100">
                  {hidden.map((item, i) => {
                    const Icon = item.icon;
                    const inner = (
                      <>
                        {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
                        {item.label}
                      </>
                    );
                    return item.href ? (
                      <DropdownMenuItem key={i} asChild>
                        {renderLink ? (
                          renderLink({ href: item.href, className: "", children: inner, item })
                        ) : (
                          <a href={item.href} onClick={item.onClick}>
                            {inner}
                          </a>
                        )}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem key={i} onSelect={() => item.onClick?.()}>
                        {inner}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
            {after.map((item, i) => (
              <Fragment key={`a-${i}`}>
                {sep}
                {renderCrumb(item, items.length - itemsAfterCollapse + i)}
              </Fragment>
            ))}
          </>
        ) : null}
      </ol>
    </nav>
  );
}
