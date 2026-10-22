import { FILTER_OPERATORS, UNARY_OPERATORS, fieldKey, leafFilters } from "./types";
import type { FilterDescriptor, FilterOperator, GridState, SortDescriptor } from "./types";

/** `[field, operator, value?, ignoreCase?]` — `1` in the last slot means `ignoreCase: true`. */
export type FilterTuple = [field: string, operator: FilterOperator, value?: unknown, ignoreCase?: 1];
export type SortTuple = [field: string, dir: "asc" | "desc"];

/** The `f` (filters) and `s` (sort) search params; `prefix` tells two grids on one page apart. */
export type GridStateSearch<P extends string = ""> = { [K in `${P}f`]?: FilterTuple[] } & {
  [K in `${P}s`]?: SortTuple[];
};

const OPERATORS: ReadonlySet<string> = new Set(FILTER_OPERATORS);
const isPrimitive = (value: unknown): boolean => ["string", "number", "boolean"].includes(typeof value);

function decodeFilter(raw: unknown): FilterDescriptor | null {
  if (!Array.isArray(raw)) return null;
  const [field, operator, value, ignoreCase] = raw as unknown[];
  if (typeof field !== "string" || typeof operator !== "string" || !OPERATORS.has(operator)) return null;
  const op = operator as FilterOperator;
  if (UNARY_OPERATORS.has(op)) return { field, operator: op };
  if (op === "in" || op === "notIn") {
    if (!Array.isArray(value) || value.length === 0 || !value.every(isPrimitive)) return null;
  } else if (op === "between") {
    if (!Array.isArray(value) || value.length !== 2 || !value.every(isPrimitive)) return null;
  } else if (!isPrimitive(value)) return null;
  return ignoreCase === 1 ? { field, operator: op, value, ignoreCase: true } : { field, operator: op, value };
}

function decodeSort(raw: unknown): SortDescriptor | null {
  if (!Array.isArray(raw)) return null;
  const [field, dir] = raw as unknown[];
  return typeof field === "string" && (dir === "asc" || dir === "desc") ? { field, dir } : null;
}

/**
 * Reads filter and sort back out of (already JSON-parsed) search params.
 * Malformed tuples and unknown operators are dropped, never thrown; the last
 * filter per field wins. No router dependency — feed it whatever your router
 * parsed.
 */
export function decodeGridStateSearch(
  search: Record<string, unknown>,
  prefix = "",
): Pick<GridState, "filter" | "sort"> {
  const rawFilters = search[`${prefix}f`];
  const rawSort = search[`${prefix}s`];
  const byField = new Map<string, FilterDescriptor>();
  for (const raw of Array.isArray(rawFilters) ? rawFilters : []) {
    const filter = decodeFilter(raw);
    if (filter) byField.set(fieldKey(filter.field), filter);
  }
  const sort = (Array.isArray(rawSort) ? rawSort : []).flatMap((raw) => decodeSort(raw) ?? []);
  return { filter: byField.size > 0 ? { logic: "and", filters: [...byField.values()] } : null, sort };
}

/**
 * Writes filter and sort as compact tuples. Only the leaves of a flat AND
 * survive (what the built-in widgets produce); an empty part encodes as
 * `undefined` so the param drops out of the URL.
 */
export function encodeGridStateSearch(
  state: Pick<GridState, "filter" | "sort">,
  prefix = "",
): Record<string, unknown> {
  const filters: FilterTuple[] = leafFilters(state.filter).map((f) => {
    const tuple: FilterTuple = [fieldKey(f.field), f.operator];
    if (!UNARY_OPERATORS.has(f.operator)) tuple.push(f.value);
    if (f.ignoreCase && tuple.length === 3) tuple.push(1);
    return tuple;
  });
  const sort: SortTuple[] = state.sort.map((s) => [s.field, s.dir]);
  return {
    [`${prefix}f`]: filters.length > 0 ? filters : undefined,
    [`${prefix}s`]: sort.length > 0 ? sort : undefined,
  };
}

/** For a router's `validateSearch`: keeps well-formed filter and sort params, drops everything else. */
export function validateGridStateSearch<P extends string = "">(
  search: Record<string, unknown>,
  prefix?: P,
): GridStateSearch<P> {
  const encoded = encodeGridStateSearch(decodeGridStateSearch(search, prefix), prefix);
  return Object.fromEntries(Object.entries(encoded).filter(([, v]) => v !== undefined)) as GridStateSearch<P>;
}
