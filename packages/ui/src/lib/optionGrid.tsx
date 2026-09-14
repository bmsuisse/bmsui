import type { ReactElement, ReactNode } from "react";
import { cn } from "./utils";
import type { GroupableOption } from "./optionGrouping";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../primitives/table";

/** A column shown in a grid-style option popup (see `renderGridOptions`). `key`
 * selects what each row shows in that column: the literal string `"label"` reads
 * the option's own `label`, anything else reads `option.data?.[key]`. */
export interface GridColumn {
  key: string;
  header: string;
  className?: string;
}

/** Minimal shape `renderGridOptions` needs from an option — both `ComboboxOption`
 * and `TagComboboxOption` satisfy this once they carry `data`. */
export interface GridableOption extends GroupableOption {
  label: string;
  data?: Record<string, ReactNode>;
}

interface RenderGridOptionsProps<T extends GridableOption> {
  columns: GridColumn[];
  options: T[];
  activeIndex: number;
  multiple: boolean;
  isSelected: (option: T) => boolean;
  onSelect: (option: T) => void;
  onHover: (index: number) => void;
  testId?: string;
}

/**
 * Renders `options` as a table (built on the same `Table`/`TableRow`/`TableCell`
 * primitives every other table in this package uses, so a future styling tweak
 * there — borders, checkbox-column padding, etc. — reaches this too) instead of
 * the default flat label list — the `columns` counterpart to `buildRenderChunks`'s
 * grouped-label rendering. Deliberately ignores each option's `group` (an
 * option-grid header spanning several unrelated columns has no obvious layout,
 * and no caller has asked for it yet) — grid mode and grouping are mutually
 * exclusive, documented on the `columns` prop of both `Combobox` and `TagCombobox`.
 */
export function renderGridOptions<T extends GridableOption>({
  columns,
  options,
  activeIndex,
  multiple,
  isSelected,
  onSelect,
  onHover,
  testId,
}: RenderGridOptionsProps<T>): ReactElement {
  return (
    <Table className="text-sm">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {multiple && <TableHead className="sticky top-0 z-10 w-6 bg-muted" />}
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={cn("sticky top-0 z-10 whitespace-nowrap bg-muted text-xs", column.className)}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {options.map((option, index) => {
          const selected = isSelected(option);
          const active = index === activeIndex;
          return (
            <TableRow
              key={option.value}
              role="option"
              aria-selected={selected}
              // Otherwise a screen reader reads every column's text as the option's
              // name (e.g. "Germany Berlin Europe") instead of just its label,
              // unlike the flat list's <button>, whose accessible name is the
              // label alone.
              aria-label={option.label}
              aria-disabled={option.disabled}
              data-testid={testId ? `${testId}-option` : undefined}
              data-option-value={option.value}
              onMouseEnter={() => onHover(index)}
              onClick={() => {
                if (!option.disabled) onSelect(option);
              }}
              className={cn(
                "cursor-pointer outline-none",
                // `hover:bg-accent` repeats the active row's own background under
                // `:hover` -- otherwise TableRow's default `hover:bg-muted/50`
                // would win over the plain `bg-accent` below (later in the
                // stylesheet) and flash the active/keyboard-selected row to the
                // wrong color the instant the mouse sits over it.
                active && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
                option.disabled && "pointer-events-none opacity-50",
              )}
            >
              {multiple && (
                <TableCell className="w-6">
                  <input
                    type="checkbox"
                    checked={selected}
                    readOnly
                    tabIndex={-1}
                    className="pointer-events-none h-3.5 w-3.5 shrink-0 accent-primary"
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.key} className={cn("truncate", column.className)}>
                  {column.key === "label" ? option.label : option.data?.[column.key]}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
