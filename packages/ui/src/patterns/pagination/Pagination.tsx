import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../primitives/select";

export type PageRangeItem = number | "ellipsis";

/**
 * Page numbers to show, with `"ellipsis"` gaps. Always keeps the first and last
 * page, the current page and `siblingCount` pages on each side, and keeps the
 * number of slots constant (`5 + 2 * siblingCount`) so the bar doesn't jump
 * while paging. Same rules as Astryx's `generatePageRange`.
 *
 * getPageRange(5, 10)  → [1, "ellipsis", 4, 5, 6, "ellipsis", 10]
 * getPageRange(1, 10)  → [1, 2, 3, 4, 5, "ellipsis", 10]
 */
export function getPageRange(page: number, pageCount: number, siblingCount = 1): PageRangeItem[] {
  const total = Math.max(0, Math.floor(pageCount));
  const slots = 5 + 2 * siblingCount;
  if (total <= slots) return Array.from({ length: total }, (_, i) => i + 1);
  const current = Math.min(Math.max(1, page), total);
  const left = Math.max(current - siblingCount, 1);
  const right = Math.min(current + siblingCount, total);
  const showLeft = left > 2;
  const showRight = right < total - 1;
  const edge = 3 + 2 * siblingCount;
  if (!showLeft && showRight) {
    return [...Array.from({ length: edge }, (_, i) => i + 1), "ellipsis", total];
  }
  if (showLeft && !showRight) {
    return [1, "ellipsis", ...Array.from({ length: edge }, (_, i) => total - edge + 1 + i)];
  }
  const middle = Array.from({ length: right - left + 1 }, (_, i) => left + i);
  return [1, "ellipsis", ...middle, "ellipsis", total];
}

export interface PaginationLabels {
  /** Accessible name of the `<nav>`. */
  nav: string;
  previous: string;
  next: string;
  /** Accessible name of a page button. */
  page: (page: number) => string;
  /** "1–25 of 312" (numbers already formatted). */
  range: (from: string, to: string, total: string) => string;
  /** Shown instead of `range` when there are no items. */
  empty: string;
  /** Label before the page-size select. */
  pageSize: string;
  /** Compact (phone) indicator: "3 / 13". */
  compact: (page: number, pageCount: number) => string;
}

export const defaultPaginationLabels: PaginationLabels = {
  nav: "Pagination",
  previous: "Previous",
  next: "Next",
  page: (page) => `Page ${page}`,
  range: (from, to, total) => `${from}–${to} of ${total}`,
  empty: "No results",
  pageSize: "Rows per page",
  compact: (page, pageCount) => `${page} / ${pageCount}`,
};

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  /** Current page, 1-based. */
  page: number;
  onPageChange: (page: number) => void;
  /** Number of pages. Derived from `totalItems` / `pageSize` when omitted. */
  pageCount?: number;
  /** Total rows; enables the "1–25 of 312" text. */
  totalItems?: number;
  /** Rows per page. Needed for the range text and the page-size select. */
  pageSize?: number;
  /** Shows a page-size select with these options (needs `onPageSizeChange`). */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Pages shown on each side of the current one. @default 1 */
  siblingCount?: number;
  /** Always use the compact prev / "3 / 13" / next form (it's automatic below the `sm` breakpoint). */
  compact?: boolean;
  /** Hide the "1–25 of 312" text even when `totalItems` is known. */
  hideRange?: boolean;
  disabled?: boolean;
  /** Number formatting locale for the range text. @default "en-US" */
  locale?: string;
  labels?: Partial<PaginationLabels>;
}

const pageButton =
  "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-2 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

/**
 * Page controls for a paged list or server-paged table: previous/next, page
 * numbers with "…" gaps, optional rows-per-page select and a "1–25 of 312"
 * range. Collapses to previous / "3 / 13" / next on phones. Use it in a
 * `TableShell` `footer`; for client-side datagrid paging, `@bmsuisse/datagrid`
 * ships its own pager.
 */
export function Pagination({
  page,
  onPageChange,
  pageCount: pageCountProp,
  totalItems,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  siblingCount = 1,
  compact = false,
  hideRange = false,
  disabled = false,
  locale = "en-US",
  labels,
  className,
  ...props
}: PaginationProps): ReactElement {
  const l = { ...defaultPaginationLabels, ...labels };
  const pageCount = Math.max(
    1,
    pageCountProp ?? (totalItems != null && pageSize ? Math.ceil(totalItems / pageSize) : 1),
  );
  const current = Math.min(Math.max(1, page), pageCount);
  const fmt = new Intl.NumberFormat(locale);
  const go = (to: number): void => {
    const next = Math.min(Math.max(1, to), pageCount);
    if (next !== current) onPageChange(next);
  };

  const showRange = !hideRange && totalItems != null && pageSize != null;
  const rangeText = showRange
    ? totalItems === 0
      ? l.empty
      : l.range(
          fmt.format((current - 1) * pageSize + 1),
          fmt.format(Math.min(current * pageSize, totalItems)),
          fmt.format(totalItems),
        )
    : null;
  const showSize = pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && pageSize != null;

  return (
    <nav
      aria-label={l.nav}
      data-testid="pagination"
      className={cn("flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm", className)}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-4 text-muted-foreground">
        {rangeText ? (
          <span data-testid="pagination-range" aria-live="polite" className="whitespace-nowrap tabular-nums">
            {rangeText}
          </span>
        ) : null}
        {showSize ? (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span aria-hidden="true" className={cn(compact ? "sr-only" : "max-sm:sr-only")}>{l.pageSize}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger
                size="sm"
                aria-label={l.pageSize}
                data-testid="pagination-page-size"
                className="w-[4.75rem] gap-1 tabular-nums text-foreground"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={disabled || current <= 1}
          aria-label={l.previous}
          data-testid="pagination-previous"
          className={cn(pageButton, "text-muted-foreground hover:bg-muted hover:text-foreground sm:pr-2.5")}
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          <span className={cn("max-sm:hidden", compact && "hidden")}>{l.previous}</span>
        </button>
        <ul className={cn("items-center gap-1", compact ? "hidden" : "hidden sm:flex")}>
          {getPageRange(current, pageCount, siblingCount).map((item, i) =>
            item === "ellipsis" ? (
              <li key={`e-${i}`} aria-hidden="true" className="flex h-8 w-8 items-center justify-center text-muted-foreground">
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  disabled={disabled}
                  aria-label={l.page(item)}
                  aria-current={item === current ? "page" : undefined}
                  data-testid="pagination-page"
                  className={cn(
                    pageButton,
                    item === current
                      ? "border border-border bg-muted font-semibold text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ul>
        <span
          data-testid="pagination-compact"
          className={cn("px-2 tabular-nums text-muted-foreground", compact ? "inline" : "sm:hidden")}
        >
          {l.compact(current, pageCount)}
        </span>
        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={disabled || current >= pageCount}
          aria-label={l.next}
          data-testid="pagination-next"
          className={cn(pageButton, "text-muted-foreground hover:bg-muted hover:text-foreground sm:pl-2.5")}
        >
          <span className={cn("max-sm:hidden", compact && "hidden")}>{l.next}</span>
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
