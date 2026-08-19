import { MoreVertical } from "lucide-react";
import type { ReactElement } from "react";
import { useMemo } from "react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { stopRowClick } from "../lib/utils";
import { resolveMenuItems } from "./resolveMenuItems";
import type { MenuItem, MenuItemContext } from "./types";

interface ActionsMenuProps<TRow> {
  items: readonly MenuItem<TRow>[];
  ctx: MenuItemContext<TRow>;
  /** Accessible label for the trigger button, e.g. "Row actions" or "Bulk actions". */
  triggerLabel: string;
}

/**
 * Shared rendering for both `rowActions` (per-row kebab menu) and
 * `headerActions` (toolbar menu) — they differ only in what `ctx` they're
 * evaluated against (`{ row }` vs `{ selectedRows }`) and the trigger's
 * accessible label, so <DataGrid> passes those in rather than this module
 * having two near-identical components.
 */
export function ActionsMenu<TRow>({ items, ctx, triggerLabel }: ActionsMenuProps<TRow>): ReactElement | null {
  // `<DataGrid>` instantiates one `<ActionsMenu>` per visible row (for
  // `rowActions`) and re-renders every one of them on every scroll tick —
  // memoized on `ctx.row`/`ctx.selectedRows` (the parts of `ctx` any
  // `visible`/`disabled` predicate can actually read) rather than on `ctx`
  // itself, since the caller passes a fresh `{ row: row.original }` object
  // literal every render; that identity churn would otherwise defeat a
  // naive `useMemo([items, ctx])` even though the row itself hasn't changed.
  const resolved = useMemo(
    () => resolveMenuItems(items, ctx),
    [items, ctx.row, ctx.selectedRows],
  );
  if (resolved.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={triggerLabel} onClick={stopRowClick}>
          <MoreVertical className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {resolved.map((item) => (
          <DropdownMenuItem
            key={item.id}
            danger={item.danger}
            disabled={item.isDisabled}
            onSelect={() => item.onSelect(ctx)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
