import { FunnelIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { useId } from "react";
import type { StringColumn } from "../column/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { cn } from "../lib/utils";
import type { FilterOperator } from "./types";
import type { FilterWidgetProps } from "./widget-types";

interface StringOperatorOption {
  value: "contains" | "eq" | "startsWith" | "endsWith";
  label: string;
}

const STRING_OPERATORS: readonly StringOperatorOption[] = [
  { value: "contains", label: "Contains" },
  { value: "eq", label: "Is" },
  { value: "startsWith", label: "Starts with" },
  { value: "endsWith", label: "Ends with" },
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
}: FilterWidgetProps<StringColumn<TRow>> & { bare?: boolean }): ReactElement {
  const operator = value?.operator ?? DEFAULT_OPERATOR;
  const text = typeof value?.value === "string" ? value.value : "";
  const inputId = useId();
  const isFiltered = text !== "";

  function emit(nextOperator: FilterOperator, nextText: string): void {
    if (nextText === "") {
      onChange(undefined);
      return;
    }
    onChange({ field: column.id, operator: nextOperator, value: nextText });
  }

  const panel = (
    <div className="flex w-full max-w-[220px] flex-col gap-2">
      <Select
        value={operator}
        onValueChange={(next) => {
          // radix Select's onValueChange is typed as (value: string) => void, but the
          // value can only ever be one of the `value` props on the SelectItems below,
          // which are drawn from STRING_OPERATORS.
          const nextOperator = STRING_OPERATORS.find((option) => option.value === next)?.value;
          if (nextOperator) emit(nextOperator, text);
        }}
      >
        <SelectTrigger aria-label={`${column.header} filter operator`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STRING_OPERATORS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={inputId}
        value={text}
        placeholder={`Filter ${column.header.toLowerCase()}...`}
        onChange={(event) => emit(operator, event.target.value)}
      />
    </div>
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
          className={cn("gap-1", isFiltered ? "max-w-[160px] px-2" : "w-8 justify-center px-0")}
          aria-label={`Filter ${column.header}`}
          data-testid={`filter-${column.id}`}
        >
          <FunnelIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          {isFiltered && <span className="truncate">{text}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">{panel}</PopoverContent>
    </Popover>
  );
}
