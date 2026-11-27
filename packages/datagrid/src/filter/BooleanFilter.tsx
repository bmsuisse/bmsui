import type { ReactElement } from "react";
import type { BooleanColumn } from "../column/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { FilterShell } from "./FilterShell";
import type { FilterDescriptor } from "./types";
import { useFilterLabels } from "./labels";
import type { FilterWidgetProps } from "./widget-types";

type BooleanChoice = "all" | "yes" | "no";

const BOOLEAN_CHOICES: readonly { value: BooleanChoice; labelKey: "booleanAll" | "booleanYes" | "booleanNo" }[] = [
  { value: "all", labelKey: "booleanAll" },
  { value: "yes", labelKey: "booleanYes" },
  { value: "no", labelKey: "booleanNo" },
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
  labels: labelOverrides,
}: FilterWidgetProps<BooleanColumn<TRow>> & { bare?: boolean }): ReactElement {
  const labels = useFilterLabels(labelOverrides);
  const choice = choiceOf(value);
  const isFiltered = choice !== "all";
  const summary = choice === "yes" ? labels.booleanYes : choice === "no" ? labels.booleanNo : "";

  function emit(next: BooleanChoice): void {
    if (next === "all") {
      onChange(undefined);
      return;
    }
    onChange({ field: column.id, operator: "eq", value: next === "yes" });
  }

  const items = BOOLEAN_CHOICES.map((option) => ({ value: option.value, label: labels[option.labelKey] }));
  const panel = (
    <Select
      items={items}
      value={choice}
      onValueChange={(next) => {
        if (next) emit(next);
      }}
    >
      <SelectTrigger aria-label={labels.booleanAriaLabel(column.header)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <FilterShell
      columnId={column.id}
      ariaLabel={labels.filterAriaLabel(column.header)}
      bare={bare}
      isFiltered={isFiltered}
      summary={summary}
      maxWidthClass="max-w-[140px]"
      contentClassName="w-40 p-2"
    >
      {panel}
    </FilterShell>
  );
}
