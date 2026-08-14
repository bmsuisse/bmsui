/**
 * Shared filter/sort contract for @bmsuisse/datagrid.
 *
 * This shape is intentionally mirrored byte-for-byte (field names and operator
 * set) by the Python package `bmsdna.datagrid` (see `bmsdna/datagrid/filters.py`)
 * so that a `GridState` produced by the grid in "server" mode can be serialized
 * as JSON and handed directly to a FastAPI endpoint that turns it into SQL or a
 * Meilisearch filter string.
 */

/** The full set of operators supported by any FilterDescriptor. */
export type FilterOperator =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "in"
  | "notIn"
  | "contains"
  | "doesNotContain"
  | "startsWith"
  | "endsWith"
  | "isEmpty"
  | "isNotEmpty"
  | "isNull"
  | "isNotNull"
  | "between";

/**
 * A single leaf filter condition.
 *
 * `field` is either a plain field name, or a pre-qualified path (e.g.
 * `["c", "customer_name"]` for `c.customer_name` in a join) — the grid never
 * infers joins, callers pre-qualify ambiguous fields themselves.
 *
 * `value` is an array for `in`/`notIn`/`between`, and is omitted entirely for
 * unary operators like `isNull`/`isNotNull`/`isEmpty`/`isNotEmpty`.
 */
export interface FilterDescriptor {
  field: string | string[];
  operator: FilterOperator;
  value?: unknown;
  ignoreCase?: boolean;
}

/** Combines two or more filters (leaf or nested composite) with AND/OR logic. */
export interface CompositeFilterDescriptor {
  logic: "and" | "or";
  filters: (FilterDescriptor | CompositeFilterDescriptor)[];
}

export interface SortDescriptor {
  field: string;
  dir: "asc" | "desc";
}

/** The full sort/filter/pagination state a <DataGrid> tracks and can emit. */
export interface GridState {
  filter: CompositeFilterDescriptor | null;
  sort: SortDescriptor[];
  page: number;
  pageSize: number;
}

/** True for a leaf `FilterDescriptor`, false for a `CompositeFilterDescriptor`. */
export function isFilterDescriptor(
  node: FilterDescriptor | CompositeFilterDescriptor,
): node is FilterDescriptor {
  return "operator" in node;
}

/** True for a `CompositeFilterDescriptor`, false for a leaf `FilterDescriptor`. */
export function isCompositeFilterDescriptor(
  node: FilterDescriptor | CompositeFilterDescriptor,
): node is CompositeFilterDescriptor {
  return "logic" in node;
}

/** Operators that never carry a `value` (unary presence/absence checks). */
export const UNARY_OPERATORS: ReadonlySet<FilterOperator> = new Set([
  "isEmpty",
  "isNotEmpty",
  "isNull",
  "isNotNull",
]);

/** Renders a `field` (string or pre-qualified path) as a single dotted key, for use as a stable id/key. */
export function fieldKey(field: string | string[]): string {
  return Array.isArray(field) ? field.join(".") : field;
}
