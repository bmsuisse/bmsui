import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { SearchBar, type SearchBarProps } from "../search-bar/SearchBar";
import { PageHeader, type PageHeaderProps } from "../page-header/PageHeader";

export interface TableShellProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Top band: usually a `TableToolbar` (search, filters, actions). */
  toolbar?: ReactNode;
  /** Muted strip under the toolbar: result count, active-filter chips. */
  meta?: ReactNode;
  /** The grid or list itself, e.g. `@bmsuisse/datagrid`'s `DataGrid`. */
  children: ReactNode;
  /** Bottom band: a `Pagination`, totals, "last synced". */
  footer?: ReactNode;
  /** Drop the panel border/radius, for a shell already inside a card. @default false */
  flush?: boolean;
  /** Fill the remaining height of a flex column; the body becomes a `min-h-0 flex-1` column so a grid can scroll inside it. @default false */
  fill?: boolean;
  /** Test id on the `<section>`. @default "table-shell" */
  "data-testid"?: string;
  /** @deprecated Use `data-testid`. Alias kept for OneSales's `TableShell` API; `data-testid` wins when both are set. */
  testId?: string;
}

/**
 * Panel around a filterable table or list, in stacked bands: toolbar → meta
 * strip → body → footer. Use it for every table page so search, filters and
 * paging sit in the same place everywhere; wrap it in `TablePage` to get the
 * page title on top. Lifted from OneSales's `ui/TableShell`. Has no datagrid
 * dependency: put a `DataGrid`, a `Table` or any list in `children`.
 */
export function TableShell({
  toolbar,
  meta,
  children,
  footer,
  flush = false,
  fill = false,
  className,
  "data-testid": dataTestId,
  testId,
  ...props
}: TableShellProps): ReactElement {
  return (
    <section
      data-table-shell=""
      data-testid={dataTestId ?? testId ?? "table-shell"}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden bg-background",
        !flush && "rounded-xl border border-foreground/10 shadow-xs dark:border-border",
        // Not filling: keep natural height -- inside a page that scrolls as a whole a
        // shrinkable overflow-hidden panel would clip its own rows.
        fill ? "min-h-0 flex-1" : "shrink-0",
        className,
      )}
      {...props}
    >
      {toolbar ? (
        <div data-slot="table-shell-toolbar" className="shrink-0 border-b border-foreground/[0.07] px-3 py-2.5 md:px-4 dark:border-border">
          {toolbar}
        </div>
      ) : null}
      {meta ? (
        <div
          data-slot="table-shell-meta"
          className="flex min-h-8 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-foreground/[0.07] bg-foreground/[0.015] px-3 py-1.5 text-xs text-muted-foreground md:px-4 dark:border-border dark:bg-foreground/[0.03]"
        >
          {meta}
        </div>
      ) : null}
      <div
        data-slot="table-shell-body"
        className={cn(
          "min-w-0",
          // A plain <table> in the body: first/last cells line up with the toolbar's
          // and footer's 12px/16px inset, so every band shares one left edge.
          "[&_table_tr>*:first-child]:pl-3 [&_table_tr>*:last-child]:pr-3 md:[&_table_tr>*:first-child]:pl-4 md:[&_table_tr>*:last-child]:pr-4",
          fill && "flex min-h-0 flex-1 flex-col overflow-auto",
        )}
      >
        {children}
      </div>
      {footer ? (
        <div
          data-slot="table-shell-footer"
          className="shrink-0 border-t border-foreground/[0.07] bg-foreground/[0.015] px-3 py-2 text-xs text-muted-foreground md:px-4 dark:border-border dark:bg-foreground/[0.03]"
        >
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export interface TableToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Panel title; on phones it shares the first line with `actions` and the search wraps below. */
  title?: ReactNode;
  /** Usually a `TableSearch`. */
  search?: ReactNode;
  /** Filter pills/selects after the search. */
  filters?: ReactNode;
  /** Pinned to the right (New, Export, view switcher). */
  actions?: ReactNode;
  /** Test id on the toolbar row. @default "table-toolbar" */
  "data-testid"?: string;
  /** @deprecated Use `data-testid` (alias kept for OneSales compatibility; `data-testid` wins when both are set). */
  testId?: string;
}

/** Toolbar band for a `TableShell`: title, search, filters, then `actions` pinned right. Wraps on narrow screens. */
export function TableToolbar({
  title,
  search,
  filters,
  actions,
  className,
  "data-testid": dataTestId,
  testId,
  ...props
}: TableToolbarProps): ReactElement {
  return (
    <div data-testid={dataTestId ?? testId ?? "table-toolbar"} className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
      {title ? (
        <span className="mr-auto shrink-0 text-sm font-semibold text-foreground md:mr-2">{title}</span>
      ) : null}
      {search}
      {filters ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            // Chips added later (an active filter appearing) fade/scale in; colours keep their hover transition.
            "[&>*]:transition-[color,background-color,border-color,opacity,scale] [&>*]:duration-150 [&>*]:ease-out [&>*]:starting:scale-95 [&>*]:starting:opacity-0 motion-reduce:[&>*]:starting:scale-100",
          )}
        >
          {filters}
        </div>
      ) : null}
      {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type TableSearchProps = SearchBarProps;

/**
 * `SearchBar` sized for a `TableToolbar`: full width with a 44px field on
 * phones, a compact 32px, 16rem field from `md` up so it lines up with filter
 * pills and `size="sm"` buttons.
 */
export function TableSearch({ className, ...props }: TableSearchProps): ReactElement {
  return (
    <SearchBar
      className={cn(
        "w-full md:w-64 md:flex-none",
        "md:[&_input]:h-8 md:[&_input]:pl-9 md:[&_input]:text-[13px] md:[&>div>span:first-child]:left-3 md:[&_button]:h-6 md:[&_button]:w-6 md:[&_button]:right-1",
        className,
      )}
      {...props}
    />
  );
}

export interface TableResultCountLabels {
  /** No filter active: "48 results". */
  total: (count: string) => string;
  /** Filtered: "12 of 48". */
  filtered: (shown: string, total: string) => string;
  /** A paged feed with more to load: "48+ loaded". */
  more: (count: string) => string;
}

export const defaultTableResultCountLabels: TableResultCountLabels = {
  total: (count) => `${count} results`,
  filtered: (shown, total) => `${shown} of ${total}`,
  more: (count) => `${count}+ loaded`,
};

export interface TableResultCountProps extends HTMLAttributes<HTMLSpanElement> {
  /** Rows currently shown (after filters). */
  shown: number;
  /** All rows before filters; when different from `shown` the count reads "12 of 48". */
  total?: number;
  /** More pages can still be loaded: "48+ loaded". */
  hasMore?: boolean;
  /** Number formatting locale. @default "de-CH" */
  locale?: string;
  labels?: Partial<TableResultCountLabels>;
  /** Test id on the count. @default "table-result-count" */
  "data-testid"?: string;
  /** @deprecated Use `data-testid` (alias kept for OneSales compatibility; `data-testid` wins when both are set). */
  testId?: string;
}

/** Lead item of a `TableShell` meta strip: "48 results", "12 of 48" when filtered, "48+ loaded" for a paged feed. */
export function TableResultCount({
  shown,
  total,
  hasMore = false,
  locale = "de-CH",
  labels,
  className,
  "data-testid": dataTestId,
  testId,
  ...props
}: TableResultCountProps): ReactElement {
  const l = { ...defaultTableResultCountLabels, ...labels };
  const fmt = new Intl.NumberFormat(locale);
  const filtered = total != null && total !== shown;
  return (
    <span
      data-testid={dataTestId ?? testId ?? "table-result-count"}
      className={cn("font-medium tabular-nums text-foreground", className)}
      {...props}
    >
      {hasMore ? l.more(fmt.format(shown)) : filtered ? l.filtered(fmt.format(shown), fmt.format(total)) : l.total(fmt.format(shown))}
    </span>
  );
}

export interface TablePageProps
  extends Partial<
    Pick<
      PageHeaderProps,
      "title" | "description" | "actions" | "badge" | "onBack" | "backHref" | "breadcrumbs" | "tabs" | "labels"
    >
  > {
  /** Replaces the built-in `PageHeader` entirely. */
  header?: ReactNode;
  /** Usually a `TableToolbar`. */
  toolbar?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Fill the parent's height so the grid scrolls inside the panel, not the page. @default true */
  fill?: boolean;
  className?: string;
  /** Class for the inner `TableShell`. */
  shellClassName?: string;
  "data-testid"?: string;
}

/**
 * A whole table page: `PageHeader` on top, a `TableShell` (toolbar, meta,
 * body, footer) filling the rest of the height. Give its parent a height
 * (`h-full`/`flex-1` in your app shell) so the grid scrolls inside the panel
 * and the header and pagination stay put.
 */
export function TablePage({
  title,
  description,
  actions,
  badge,
  onBack,
  backHref,
  breadcrumbs,
  tabs,
  labels,
  header,
  toolbar,
  meta,
  footer,
  children,
  fill = true,
  className,
  shellClassName,
  "data-testid": testId = "table-page",
}: TablePageProps): ReactElement {
  return (
    <div data-testid={testId} className={cn("flex min-w-0 flex-col gap-4", fill && "h-full min-h-0", className)}>
      {header ?? (
        <PageHeader
          title={title ?? null}
          description={description}
          actions={actions}
          badge={badge}
          onBack={onBack}
          backHref={backHref}
          breadcrumbs={breadcrumbs}
          tabs={tabs}
          labels={labels}
        />
      )}
      <TableShell toolbar={toolbar} meta={meta} footer={footer} fill={fill} className={shellClassName}>
        {children}
      </TableShell>
    </div>
  );
}
