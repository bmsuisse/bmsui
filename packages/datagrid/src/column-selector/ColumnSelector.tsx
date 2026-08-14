import { Columns3 } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
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
import { readPersistedVisibility, writePersistedVisibility } from "./persistence";
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
 * `visibility` prop.
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

  function commit(next: ColumnVisibility): void {
    onVisibilityChange(next);
    if (persistKey) writePersistedVisibility(persistKey, next);
  }

  function toggleColumn(columnId: string): void {
    if (!canHideColumn(columns, visibility, columnId)) return;
    commit({ ...visibility, [columnId]: !isColumnVisible(visibility, columnId) });
  }

  const totalVisible = countVisible(columns, visibility);
  const groups = groupColumns(columns);

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
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent/50 focus-within:bg-accent/50"
                  >
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
