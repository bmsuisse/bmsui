import { FunnelIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { defaultFormat } from "../column/format";
import type { NumberColumn } from "../column/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { cn } from "../lib/utils";
import { isNumberPair } from "./numberRangeShared";
import type { FilterDescriptor, FilterOperator } from "./types";
import type { FilterWidgetProps } from "./widget-types";

type NumberOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "between";

interface NumberOperatorOption {
  value: NumberOperator;
  label: string;
}

const NUMBER_OPERATORS: readonly NumberOperatorOption[] = [
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal to" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal to" },
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Does not equal" },
  { value: "between", label: "Between" },
];

const OPERATOR_SYMBOL: Record<Exclude<NumberOperator, "between">, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  neq: "≠",
};

const DEFAULT_OPERATOR: NumberOperator = "gt";

const NUMBER_OPERATOR_VALUES: ReadonlySet<string> = new Set(NUMBER_OPERATORS.map((option) => option.value));

function isNumberOperator(operator: FilterOperator | undefined): operator is NumberOperator {
  return operator !== undefined && NUMBER_OPERATOR_VALUES.has(operator);
}

function parseNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

interface ComparisonState {
  operator: NumberOperator;
  text: string;
  text2: string;
}

/** Derives the widget's own local state from the committed `FilterDescriptor` — see `emit`'s doc for why this isn't just read inline on every render. */
function stateFromValue(value: FilterDescriptor | undefined): ComparisonState {
  if (!value) return { operator: DEFAULT_OPERATOR, text: "", text2: "" };
  if (value.operator === "between" && isNumberPair(value.value)) {
    return { operator: "between", text: String(value.value[0]), text2: String(value.value[1]) };
  }
  if (isNumberOperator(value.operator) && typeof value.value === "number") {
    return { operator: value.operator, text: value.value.toString(), text2: "" };
  }
  return { operator: DEFAULT_OPERATOR, text: "", text2: "" };
}

/**
 * An Excel-style alternative to the default `NumberRangeFilter`: an operator
 * dropdown (Greater than / Less than / Equals / ... / Between) plus one
 * number input (two for `Between`), instead of a plain always-visible
 * min/max range. Not wired up as any column type's automatic default —
 * `NumberRangeFilter` still is, so existing columns keep their current
 * behavior. Use this directly as a column's custom filter UI (see
 * `BaseColumn.renderFilter`) for a numeric column where users think in
 * terms of "greater than X" rather than "between X and Y".
 *
 * Local `operator`/text state (rather than deriving straight from `value`
 * on every render, the way `StringFilter` does) is what lets `Between` hold
 * a partially-typed pair — deriving directly would wipe whatever's in the
 * OTHER box the instant the first box's own edit clears `value` back to
 * `undefined` (no filter is emitted until both bounds parse), and would
 * reset the operator dropdown back to the default the same way. The effect
 * below only resyncs from `value` when it changed for some reason other
 * than this widget's own last `onChange` call (an external clear-all, or
 * restoring a saved view) — the same pattern `NumberRangeFilter` uses for
 * the same reason.
 *
 * `bare` (default `true`) skips this component's own Popover/trigger
 * Button, rendering just the operator + input(s) directly — correct under
 * the default `filterDisplay: "popover"`, where `<DataGrid>` already
 * supplies the header filter icon and popover; passing `false` there would
 * nest a second, redundant one inside it. Pass `bare={false}` only when the
 * column also sets `filterDisplay: "row"`, where nothing else provides a
 * trigger — see `NumberHistogramFilter`'s identical `bare` doc for why.
 */
export function NumberComparisonFilter<TRow>({
  column,
  value,
  onChange,
  bare = true,
}: FilterWidgetProps<NumberColumn<TRow>> & { bare?: boolean }): ReactElement {
  const initial = stateFromValue(value);
  const [operator, setOperator] = useState<NumberOperator>(initial.operator);
  const [text, setText] = useState(initial.text);
  const [text2, setText2] = useState(initial.text2);
  const operatorId = useId();
  const valueId = useId();

  const lastEmittedRef = useRef<FilterDescriptor | undefined>(value);

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    const next = stateFromValue(value);
    setOperator(next.operator);
    setText(next.text);
    setText2(next.text2);
  }, [value]);

  function emit(nextOperator: NumberOperator, nextText: string, nextText2: string): void {
    let next: FilterDescriptor | undefined;
    if (nextOperator === "between") {
      const min = parseNumber(nextText);
      const max = parseNumber(nextText2);
      next = min !== undefined && max !== undefined ? { field: column.id, operator: "between", value: [min, max] } : undefined;
    } else {
      const num = parseNumber(nextText);
      next = num !== undefined ? { field: column.id, operator: nextOperator, value: num } : undefined;
    }
    lastEmittedRef.current = next;
    onChange(next);
  }

  const isBetween = operator === "between";
  const isFiltered = value !== undefined;
  const summary = (() => {
    if (!value) return "";
    if (value.operator === "between" && isNumberPair(value.value)) {
      const [lo, hi] = value.value;
      return `${defaultFormat(column, lo)} – ${defaultFormat(column, hi)}`;
    }
    if (isNumberOperator(value.operator) && value.operator !== "between" && typeof value.value === "number") {
      return `${OPERATOR_SYMBOL[value.operator]} ${defaultFormat(column, value.value)}`;
    }
    return "";
  })();

  const panel = (
    <div className="flex w-full max-w-[220px] flex-col gap-2">
      <Select
        value={operator}
        onValueChange={(next) => {
          const nextOperator = NUMBER_OPERATORS.find((option) => option.value === next)?.value;
          if (!nextOperator) return;
          setOperator(nextOperator);
          emit(nextOperator, text, text2);
        }}
      >
        <SelectTrigger id={operatorId} aria-label={`${column.header} filter operator`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NUMBER_OPERATORS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Input
          id={valueId}
          type="number"
          className="min-w-0"
          aria-label={isBetween ? `${column.header} minimum` : column.header}
          placeholder={isBetween ? "Min" : "Value"}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            emit(operator, event.target.value, text2);
          }}
        />
        {isBetween && (
          <>
            <span className="shrink-0 text-xs text-muted-foreground">to</span>
            <Input
              type="number"
              className="min-w-0"
              aria-label={`${column.header} maximum`}
              placeholder="Max"
              value={text2}
              onChange={(event) => {
                setText2(event.target.value);
                emit(operator, text, event.target.value);
              }}
            />
          </>
        )}
      </div>
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
          className={cn("gap-1", isFiltered ? "max-w-[180px] px-2" : "w-8 justify-center px-0")}
          aria-label={`Filter ${column.header}`}
          data-testid={`filter-${column.id}`}
        >
          <FunnelIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          {isFiltered && <span className="truncate">{summary}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">{panel}</PopoverContent>
    </Popover>
  );
}
