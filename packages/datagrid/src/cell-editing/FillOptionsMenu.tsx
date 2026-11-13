import { CheckIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import type { FillMode } from "./fillHandle";

export interface CellEditingLabels {
  /** Accessible name of the small button shown under a finished fill. */
  fillOptions: string;
  copyCells: string;
  fillSeries: string;
}

export const defaultCellEditingLabels: CellEditingLabels = {
  fillOptions: "Auto fill options",
  copyCells: "Copy cells",
  fillSeries: "Fill series",
};

/** Excel's "Auto Fill Options" button: shown under a just-finished fill, lets the user switch how it filled. */
export function FillOptionsMenu({
  mode,
  canFillSeries,
  labels,
  onSelect,
  onClosed,
}: {
  mode: FillMode;
  canFillSeries: boolean;
  labels: CellEditingLabels;
  onSelect: (mode: FillMode) => void;
  /** Called after the menu closes so the grid can take keyboard focus back. */
  onClosed: () => void;
}): ReactElement {
  const items: { mode: FillMode; label: string; disabled: boolean }[] = [
    { mode: "copy", label: labels.copyCells, disabled: false },
    { mode: "series", label: labels.fillSeries, disabled: !canFillSeries },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="cell-fill-options"
          aria-label={labels.fillOptions}
          className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
        >
          <ClipboardDocumentListIcon className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onClosed();
        }}
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.mode}
            disabled={item.disabled}
            data-testid={`cell-fill-option-${item.mode}`}
            onSelect={() => onSelect(item.mode)}
          >
            <span className="flex h-4 w-4 items-center justify-center">
              {item.mode === mode && <CheckIcon className="h-4 w-4" aria-hidden />}
            </span>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
