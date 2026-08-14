/**
 * Column visibility keyed by `ColumnDef.id`. A missing key means visible —
 * this matches TanStack Table's own `VisibilityState` convention, so a
 * `ColumnVisibility` value can be handed straight to a TanStack table's
 * `state.columnVisibility` if a consumer ever needs to.
 */
export type ColumnVisibility = Record<string, boolean>;
