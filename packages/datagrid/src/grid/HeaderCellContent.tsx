import { BarsArrowDownIcon, BarsArrowUpIcon, FunnelIcon } from "@heroicons/react/24/outline";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import type { ColumnDef } from "../column/types";
import { Button } from "../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { useFilterLabels } from "../filter/labels";
import { cn } from "../lib/utils";

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
 * funnel popover — shared by `<DataGrid>` and `<TreeDataGrid>`. The `<th>`
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
  const headerContent = column.renderHeader ? column.renderHeader(column) : column.header;
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
      {renderFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid={`filter-trigger-${column.id}`}
              aria-label={labels.filterAriaLabel(column.header)}
            >
              <FunnelIcon
                className={cn("h-3 w-3", filterActive ? "opacity-100 text-primary" : "opacity-40")}
                aria-hidden
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[var(--radix-popover-content-available-width)]">
            {renderFilter()}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
