import { BarsArrowDownIcon, BarsArrowUpIcon, FunnelIcon } from "@heroicons/react/24/outline";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import type { ColumnDef } from "../column/types";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { focusFirstTextInput } from "../filter/focus";
import { useFilterLabels } from "../filter/labels";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { cn } from "../lib/utils";

/** Below Tailwind's `md`: a header popover is cramped and keyboard-fragile on a phone, so filters open as a modal. */
const MOBILE_QUERY = "(max-width: 767px)";

export interface HeaderCellContentProps<TRow> {
  column: ColumnDef<TRow>;
  /** Id of the label element; the `<th>` points `aria-labelledby` at it. */
  labelId: string;
  sortDir?: "asc" | "desc";
  /** Set = the column renders as a sort toggle. */
  onToggleSort?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Set = the column gets a header funnel + popover holding this widget. */
  renderFilter?: () => ReactNode;
  filterActive?: boolean;
}

/**
 * A header cell's content — sort toggle (or plain label) plus the filter
 * funnel popover (a modal on mobile) — shared by `<DataGrid>` and `<TreeDataGrid>`. The `<th>`
 * itself (sizing, pinning, `aria-sort`, resize handle) stays with each grid.
 */
export function HeaderCellContent<TRow>({
  column,
  labelId,
  sortDir,
  onToggleSort,
  renderFilter,
  filterActive = false,
}: HeaderCellContentProps<TRow>): ReactElement {
  const labels = useFilterLabels();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const headerContent = column.renderHeader ? column.renderHeader(column) : column.header;
  const filterLabel = labels.filterAriaLabel(column.header);
  const filterTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="group data-[state=open]:bg-primary/15 data-[state=open]:ring-1 data-[state=open]:ring-primary/50"
      data-testid={`filter-trigger-${column.id}`}
      aria-label={filterLabel}
    >
      <FunnelIcon
        className={cn(
          "h-3 w-3 group-data-[state=open]:text-foreground group-data-[state=open]:opacity-100",
          filterActive ? "opacity-100 text-primary" : "opacity-40",
        )}
        aria-hidden
      />
    </Button>
  );
  return (
    <div className="flex items-center gap-1">
      {onToggleSort ? (
        <button
          type="button"
          id={labelId}
          data-testid={`sort-button-${column.id}`}
          className="flex items-center gap-1 rounded-sm px-1 hover:bg-accent hover:text-accent-foreground"
          onClick={onToggleSort}
        >
          {headerContent}
          {sortDir === "asc" && <BarsArrowUpIcon className="h-3 w-3" aria-hidden />}
          {sortDir === "desc" && <BarsArrowDownIcon className="h-3 w-3" aria-hidden />}
        </button>
      ) : (
        // Not wrapped in a `<button>` (unlike the sortable branch above): a
        // disabled `<button>` swallows pointer events for its entire subtree,
        // silently breaking any interactive content a column's own `renderHeader`
        // embeds directly (bare filter inputs, "select/reject all" buttons) —
        // clicks never reach them at all, even though nothing looks wrong visually.
        <div id={labelId} className="flex items-center gap-1 px-1">
          {headerContent}
        </div>
      )}
      {renderFilter &&
        (isMobile ? (
          <Dialog>
            <DialogTrigger asChild>{filterTrigger}</DialogTrigger>
            <DialogContent
              className="max-h-[85vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto"
              onOpenAutoFocus={focusFirstTextInput}
            >
              <DialogTitle>{filterLabel}</DialogTitle>
              <DialogDescription className="sr-only">{filterLabel}</DialogDescription>
              <div className="mt-4 flex justify-center">{renderFilter()}</div>
            </DialogContent>
          </Dialog>
        ) : (
          <Popover>
            <PopoverTrigger asChild>{filterTrigger}</PopoverTrigger>
            <PopoverContent
              className="w-auto max-w-[var(--radix-popover-content-available-width)]"
              onOpenAutoFocus={focusFirstTextInput}
            >
              {renderFilter()}
            </PopoverContent>
          </Popover>
        ))}
    </div>
  );
}
