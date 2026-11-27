import type { ReactElement } from "react";
import { useEffect, useId, useState } from "react";
import type { StringColumn } from "../column/types";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import type { FilterOperator } from "./types";
import { useFilterLabels } from "./labels";
import { FilterShell } from "./FilterShell";
import { firstTextInput } from "./focus";
import type { FilterWidgetProps } from "./widget-types";

interface StringOperatorOption {
  value: "contains" | "eq" | "startsWith" | "endsWith";
  labelKey: "stringContains" | "stringIs" | "stringStartsWith" | "stringEndsWith";
}

const STRING_OPERATORS: readonly StringOperatorOption[] = [
  { value: "contains", labelKey: "stringContains" },
  { value: "eq", labelKey: "stringIs" },
  { value: "startsWith", labelKey: "stringStartsWith" },
  { value: "endsWith", labelKey: "stringEndsWith" },
];

const DEFAULT_OPERATOR: FilterOperator = "contains";

/**
 * Default filter widget for `type: "string"` columns: a text input plus an
 * operator dropdown.
 *
 * `bare` (default `false`) skips this component's own Popover/trigger
 * Button, rendering just the operator + input directly — see `EnumFilter`'s
 * identical `bare` doc for why (`renderDefaultFilterWidget` passes this
 * automatically outside `filterDisplay: "row"`).
 */
export function StringFilter<TRow>({
  column,
  value,
  onChange,
  bare = false,
  labels: labelOverrides,
}: FilterWidgetProps<StringColumn<TRow>> & { bare?: boolean }): ReactElement {
  const labels = useFilterLabels(labelOverrides);
  // Tracked as local state, not derived from `value?.operator` on every render: `emit`
  // below intentionally clears the filter entirely (`onChange(undefined)`) whenever
  // `nextText` is empty, since an operator with no value isn't a filter yet -- but that
  // means picking an operator *before* typing anything (a natural "choose how to
  // search, then type" flow) would otherwise have nowhere to persist the choice: the
  // very next keystroke would derive `operator` from `value?.operator`, which is still
  // `undefined`, silently reverting to "Contains". Local state survives across that gap;
  // the effect below only resyncs it when the filter changes from *outside* this widget
  // (cleared via "reset filters", restored from a saved filter, column filters reset).
  const [operator, setOperator] = useState<FilterOperator>(value?.operator ?? DEFAULT_OPERATOR);
  const text = typeof value?.value === "string" ? value.value : "";
  const inputId = useId();
  const isFiltered = text !== "";

  useEffect(() => {
    setOperator(value?.operator ?? DEFAULT_OPERATOR);
  }, [value?.operator]);

  function emit(nextOperator: FilterOperator, nextText: string): void {
    if (nextText === "") {
      onChange(undefined);
      return;
    }
    onChange({ field: column.id, operator: nextOperator, value: nextText });
  }

  const operatorItems = STRING_OPERATORS.map((option) => ({ value: option.value, label: labels[option.labelKey] }));
  const panel = (
    <div className="flex w-full max-w-[220px] flex-col gap-2">
      <Select
        items={operatorItems}
        value={operator}
        onValueChange={(next) => {
          const nextOperator = STRING_OPERATORS.find((option) => option.value === next)?.value;
          if (!nextOperator) return;
          setOperator(nextOperator);
          emit(nextOperator, text);
        }}
      >
        <SelectTrigger aria-label={labels.operatorAriaLabel(column.header)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operatorItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={inputId}
        value={text}
        placeholder={labels.stringPlaceholder(column.header)}
        onChange={(event) => emit(operator, event.target.value)}
      />
    </div>
  );

  return (
    <FilterShell
      columnId={column.id}
      ariaLabel={labels.filterAriaLabel(column.header)}
      bare={bare}
      isFiltered={isFiltered}
      summary={text}
      maxWidthClass="max-w-[160px]"
      contentClassName="w-auto p-3"
      focusOnOpen={firstTextInput}
    >
      {panel}
    </FilterShell>
  );
}
