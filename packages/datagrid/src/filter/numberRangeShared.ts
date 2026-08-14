import type { FilterDescriptor } from "./types";

export interface NumberRange {
  min: number | undefined;
  max: number | undefined;
}

export function isNumberPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

/** Reads the current `{min, max}` out of a column's FilterDescriptor, for whichever of `between`/`gte`/`lte` it currently holds. */
export function rangeOf(value: FilterDescriptor | undefined): NumberRange {
  if (!value) return { min: undefined, max: undefined };
  if (value.operator === "between" && isNumberPair(value.value)) {
    const [min, max] = value.value;
    return { min, max };
  }
  if (value.operator === "gte" && typeof value.value === "number") {
    return { min: value.value, max: undefined };
  }
  if (value.operator === "lte" && typeof value.value === "number") {
    return { min: undefined, max: value.value };
  }
  return { min: undefined, max: undefined };
}

/**
 * Builds the FilterDescriptor for a `{min, max}` pair — `between` when both
 * bounds are set (reordered so the lower bound is always <= the upper
 * bound), `gte`/`lte` when only one is, `undefined` when neither is.
 *
 * Shared by every numeric-range widget (`NumberRangeFilter`,
 * `NumberHistogramFilter`) rather than each re-deriving it, since the
 * bound-reordering guard is easy to get subtly wrong (an inverted pair
 * would otherwise produce a `between` that evaluateFilter/sql.py/meili.py
 * all correctly, but silently, treat as matching nothing).
 */
export function descriptorFor(field: string, range: NumberRange): FilterDescriptor | undefined {
  const { min, max } = range;
  if (min !== undefined && max !== undefined) {
    const [lower, upper] = min <= max ? [min, max] : [max, min];
    return { field, operator: "between", value: [lower, upper] };
  }
  if (min !== undefined) return { field, operator: "gte", value: min };
  if (max !== undefined) return { field, operator: "lte", value: max };
  return undefined;
}
