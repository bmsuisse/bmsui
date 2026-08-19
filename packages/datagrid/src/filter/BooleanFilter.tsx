import { FunnelIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import type { BooleanColumn } from "../column/types";
import { Button } from "../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { cn } from "../lib/utils";
import type { FilterDescriptor } from "./types";
import type { FilterWidgetProps } from "./widget-types";

type BooleanChoice = "all" | "yes" | "no";

const BOOLEAN_CHOICES: readonly { value: BooleanChoice; label: string }[] = [
  { value: "all", label: "All" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

/**
 * Derives the displayed choice from a FilterDescriptor. This widget only ever
 * emits `eq`, but a `GridState` can round-trip through a URL/server and come
 * back with `neq` (e.g. a foreign caller expressing "not true") — `neq` must
 * invert the mapping, or the dropdown would display "Yes" for a filter that
 * actually means "not true" (i.e. false).
 *
 * `eq`/`neq` are the only operators this maps to a specific choice on
 * purpose: a 3-way All/Yes/No select has exactly three states to represent,
 * and `isNull`/`isNotNull`/`in`/`notIn` don't correspond to any of them
 * unambiguously (e.g. `in: [true]` and `eq: true` both "mean" Yes, but `in:
 * [true, false]` means neither Yes nor No nor really "All" either). Every
 * other operator falls through to "All" rather than guessing — a deliberate
 * scope limit of this specific widget's UI model, not a bug to keep chasing;
 * a caller who needs to represent those distinctly should render its own
 * filter UI for that column via `cell`/a custom filter render, not this one.
 */
function choiceOf(value: FilterDescriptor | undefined): BooleanChoice {
  if (!value) return "all";
  if (value.operator === "eq") {
    if (value.value === true) return "yes";
    if (value.value === false) return "no";
    return "all";
  }
  if (value.operator === "neq") {
    if (value.value === true) return "no";
    if (value.value === false) return "yes";
    return "all";
  }
  return "all";
}

/**
 * Default filter widget for `type: "boolean"` columns: a 3-way All/Yes/No
 * select.
 *
 * `bare` (default `false`) skips this component's own Popover/trigger
 * Button, rendering just the select directly — see `EnumFilter`'s identical
 * `bare` doc for why (`renderDefaultFilterWidget` passes this automatically
 * outside `filterDisplay: "row"`).
 */
export function BooleanFilter<TRow>({
  column,
  value,
  onChange,
  bare = false,
}: FilterWidgetProps<BooleanColumn<TRow>> & { bare?: boolean }): ReactElement {
  const choice = choiceOf(value);
  const isFiltered = choice !== "all";
  const summary = choice === "yes" ? "Yes" : choice === "no" ? "No" : "";

  function emit(next: BooleanChoice): void {
    if (next === "all") {
      onChange(undefined);
      return;
    }
    onChange({ field: column.id, operator: "eq", value: next === "yes" });
  }

  const panel = (
    <Select
      value={choice}
      onValueChange={(next) => {
        const match = BOOLEAN_CHOICES.find((option) => option.value === next)?.value;
        if (match) emit(match);
      }}
    >
      <SelectTrigger aria-label={`${column.header} filter`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BOOLEAN_CHOICES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (bare) {
    return <div data-testid={`filter-${column.id}`}>{panel}</div>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1", isFiltered ? "max-w-[140px] px-2" : "w-8 justify-center px-0")}
          aria-label={`Filter ${column.header}`}
          data-testid={`filter-${column.id}`}
        >
          <FunnelIcon
            className={cn("h-3.5 w-3.5 shrink-0", isFiltered ? "opacity-100 text-primary" : "opacity-40")}
            aria-hidden
          />
          {isFiltered && <span className="truncate">{summary}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2">{panel}</PopoverContent>
    </Popover>
  );
}
