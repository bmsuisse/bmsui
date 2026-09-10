import { Columns3, GripVertical } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import type { ColumnDef } from "../column/types";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { cn } from "../lib/utils";
import { applyColumnOrder, moveColumnBefore } from "./ordering";
import {
  readPersistedColumnOrder,
  readPersistedVisibility,
  writePersistedColumnOrder,
  writePersistedVisibility,
} from "./persistence";
import type { ColumnVisibility } from "./types";
import { canHideColumn, countVisible, groupColumns, isColumnVisible } from "./visibility";

export interface ColumnSelectorProps<TRow> {
  columns: ColumnDef<TRow>[];
  visibility: ColumnVisibility;
  onVisibilityChange: (visibility: ColumnVisibility) => void;
  /** If set: restore from localStorage on mount, and persist on every subsequent change. */
  persistKey?: string;
  /** Optional custom trigger; defaults to a "Columns" icon button. */
  trigger?: ReactNode;
  /** Optional controlled open state, for callers that want their own trigger entirely. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Column ids in display order (typically the same order already fed to
   * `<DataGrid columns={...}>`). When given together with
   * `onColumnOrderChange`, each row gets a drag handle so a column can be
   * dragged to a new position -- purely within its own group (or the
   * ungrouped section): a column's `group` is fixed metadata from its
   * `ColumnDef`, not something dragging can change, so a row only ever
   * visibly moves among its own group's other rows. Omit both props for the
   * original visibility-only behavior (no drag handles rendered at all).
   *
   * `onColumnOrderChange` is the only thing that ever fires on a drop --
   * exactly one call, with the fully-computed new order, so a caller can
   * persist it (to its own state store, a backend, wherever) without also
   * reaching into this component's internals. `persistKey`, if set,
   * additionally layers the same kind of localStorage restore-on-mount/write-
   * on-change sync `visibility` already gets (under a separate storage key --
   * see `persistence.ts` -- so it can't collide with or migrate previously
   * stored visibility data).
   */
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
}

/**
 * Controlled column-visibility selector: a modal listing every column,
 * grouped by `column.group` into side-by-side columns (ungrouped columns
 * first, unlabeled, matching `groupColumns`' own ordering), wrapping onto a
 * new row rather than growing the dialog past a reasonable width. Each named
 * group's header is a plain muted label — no bulk-select affordance of any
 * kind lives there (an earlier version had a tri-state checkbox, then an
 * "All"/"None" link pair, both dropped; see AGENTS.md for why). Purely
 * controlled by `visibility`/`onVisibilityChange` — `persistKey`
 * layers an optional localStorage sync on top (restore once on mount, write
 * on every change), it never becomes the source of truth in place of the
 * `visibility` prop. `columnOrder`/`onColumnOrderChange` (both optional,
 * opt-in) layer the same kind of controlled sync on top for drag-to-reorder
 * — see their own doc comments above.
 *
 * Not rendered inside `<DataGrid>` automatically — wire it up next to the
 * grid yourself, e.g.:
 *
 * ```tsx
 * const [visibility, setVisibility] = useState<ColumnVisibility>({});
 * <ColumnSelector columns={columns} visibility={visibility} onVisibilityChange={setVisibility} persistKey="orders" />
 * <DataGrid columns={columns} columnVisibility={visibility} onColumnVisibilityChange={setVisibility} ... />
 * ```
 */
export function ColumnSelector<TRow>({
  columns,
  visibility,
  onVisibilityChange,
  persistKey,
  trigger,
  open,
  onOpenChange,
  columnOrder,
  onColumnOrderChange,
}: ColumnSelectorProps<TRow>): ReactElement {
  // Restore from localStorage once on mount. Intentionally does not depend
  // on `visibility`/`onVisibilityChange` identity — this must run exactly
  // once regardless of how many times the parent re-renders.
  useEffect(() => {
    if (!persistKey) return;
    const restored = readPersistedVisibility(persistKey);
    if (restored) onVisibilityChange({ ...visibility, ...restored });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  // Same restore-on-mount for column order, gated on `onColumnOrderChange`
  // too (nothing to feed a restored order into otherwise). A separate effect
  // from the one above rather than one combined effect, since the two are
  // independent opt-ins (a caller can use persistKey for visibility only,
  // reordering only, or both) with no shared state between them.
  useEffect(() => {
    if (!persistKey || !onColumnOrderChange) return;
    const restored = readPersistedColumnOrder(persistKey);
    if (restored) onColumnOrderChange(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  function commit(next: ColumnVisibility): void {
    onVisibilityChange(next);
    if (persistKey) writePersistedVisibility(persistKey, next);
  }

  function toggleColumn(columnId: string): void {
    if (!canHideColumn(columns, visibility, columnId)) return;
    commit({ ...visibility, [columnId]: !isColumnVisible(visibility, columnId) });
  }

  const totalVisible = countVisible(columns, visibility);
  const canReorder = Boolean(onColumnOrderChange);
  const effectiveOrder = columnOrder ?? columns.map((column) => column.id);
  const orderedColumns = columnOrder ? applyColumnOrder(columns, columnOrder) : columns;
  const groups = groupColumns(orderedColumns);
  const groupById = new Map(columns.map((column) => [column.id, column.group] as const));

  // Which row is mid-drag, and which row it's currently hovering over --
  // local UI state only, never escapes this component. The committed result
  // (a new `columnOrder`) is all `onColumnOrderChange` ever sees.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleDrop(targetId: string): void {
    if (!draggedId || draggedId === targetId) return;
    // A cross-group drop would still only reorder `effectiveOrder`'s flat
    // array correctly, but `groups` re-derives each *group section's own*
    // display order from that array's first-seen order too (see
    // `groupColumns`) -- so moving a column across a group boundary would
    // silently reshuffle which group's section renders first, not just
    // reorder within a group as documented above. Reject it outright rather
    // than let the column's own group visibly "win" a section-order fight
    // its drag was never meant to affect.
    if (groupById.get(draggedId) !== groupById.get(targetId)) return;
    const next = moveColumnBefore(effectiveOrder, draggedId, targetId);
    onColumnOrderChange?.(next);
    if (persistKey) writePersistedColumnOrder(persistKey, next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="icon" aria-label="Choose columns">
            <Columns3 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-fit max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Columns</DialogTitle>
        </DialogHeader>
        {/* Groups lay out left-to-right, wrapping onto a new row instead of
            forcing the dialog wider than sm:max-w-2xl above — gap spacing
            alone separates columns (no vertical rule) so a wrapped row never
            ends up with a stray leading divider. */}
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          {groups.map(({ group, columns: groupCols }) => (
            <div key={group ?? "__ungrouped__"} className="flex min-w-32 flex-col gap-1.5">
              {group && (
                <span className="border-b pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </span>
              )}
              {groupCols.map((column) => {
                const visible = isColumnVisible(visibility, column.id);
                return (
                  <label
                    key={column.id}
                    draggable={canReorder}
                    onDragStart={canReorder ? () => setDraggedId(column.id) : undefined}
                    onDragOver={
                      canReorder
                        ? (event) => {
                            event.preventDefault();
                            setOverId(column.id);
                          }
                        : undefined
                    }
                    onDragLeave={
                      canReorder
                        ? () => setOverId((current) => (current === column.id ? null : current))
                        : undefined
                    }
                    onDrop={
                      canReorder
                        ? (event) => {
                            event.preventDefault();
                            handleDrop(column.id);
                            setDraggedId(null);
                            setOverId(null);
                          }
                        : undefined
                    }
                    onDragEnd={
                      canReorder
                        ? () => {
                            setDraggedId(null);
                            setOverId(null);
                          }
                        : undefined
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent/50 focus-within:bg-accent/50",
                      canReorder && "cursor-grab",
                      draggedId === column.id && "opacity-40",
                      overId === column.id &&
                        draggedId !== null &&
                        draggedId !== column.id &&
                        "outline -outline-offset-2 outline-2 outline-primary",
                    )}
                  >
                    {canReorder && (
                      <GripVertical
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                        aria-hidden
                      />
                    )}
                    <Checkbox
                      checked={visible}
                      disabled={visible && totalVisible <= 1}
                      onCheckedChange={() => toggleColumn(column.id)}
                    />
                    {column.header}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
