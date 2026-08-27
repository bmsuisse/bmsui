// Public entry point for @bmsuisse/datagrid.

// --- filter/sort contract -------------------------------------------------
export type {
  CompositeFilterDescriptor,
  FilterDescriptor,
  FilterOperator,
  GridState,
  SortDescriptor,
} from "./filter/types";
export { UNARY_OPERATORS, fieldKey, isCompositeFilterDescriptor, isFilterDescriptor } from "./filter/types";

// --- client-mode filter evaluation ----------------------------------------
export { evaluateFilter } from "./filter/evaluate";

// --- filter widgets ---------------------------------------------------------
export type { FilterWidgetProps } from "./filter/widget-types";
export { BooleanFilter } from "./filter/BooleanFilter";
export { DateRangeFilter } from "./filter/DateRangeFilter";
export { EnumFilter } from "./filter/EnumFilter";
export { NumberComparisonFilter } from "./filter/NumberComparisonFilter";
export { NumberRangeFilter } from "./filter/NumberRangeFilter";
export type { NumberHistogramFilterProps } from "./filter/NumberHistogramFilter";
export { NumberHistogramFilter } from "./filter/NumberHistogramFilter";
export { facetedNumberValues } from "./filter/facetedValues";
export { StringFilter } from "./filter/StringFilter";
export { renderDefaultFilterWidget } from "./filter/registry";

// --- column type system ------------------------------------------------------
export type {
  BaseColumn,
  BooleanColumn,
  ColumnAlign,
  ColumnDef,
  DateColumn,
  EnumColumn,
  EnumOption,
  NumberColumn,
  StringColumn,
} from "./column/types";
export { getColumnValue, isEditable, isFilterable, isSortable } from "./column/types";
export { alignClassName, defaultAlign, defaultFormat, toDate } from "./column/format";

// --- inline editing --------------------------------------------------------
export type { EditedRow } from "./edit/types";
export type { EditWidgetProps } from "./edit/widget-types";
export { editErrorId } from "./edit/widget-types";
export { BooleanEditor } from "./edit/BooleanEditor";
export { DateEditor } from "./edit/DateEditor";
export { EnumEditor } from "./edit/EnumEditor";
export { NumberEditor } from "./edit/NumberEditor";
export { StringEditor } from "./edit/StringEditor";
export { renderDefaultEditWidget } from "./edit/registry";

// --- column selector -----------------------------------------------------
export type { ColumnVisibility } from "./column-selector/types";
export type { ColumnSelectorProps } from "./column-selector/ColumnSelector";
export { ColumnSelector } from "./column-selector/ColumnSelector";
export type { ColumnGroup } from "./column-selector/visibility";
export {
  canHideColumn,
  canHideGroup,
  countVisible,
  groupColumns,
  isColumnVisible,
} from "./column-selector/visibility";
export { storageKeyFor } from "./column-selector/persistence";

// --- menus -------------------------------------------------------------------
export type { MenuItem, MenuItemContext } from "./menu/types";
export type { ResolvedMenuItem } from "./menu/resolveMenuItems";
export { resolveMenuItems } from "./menu/resolveMenuItems";
export { ActionsMenu } from "./menu/ActionsMenu";

// --- the grid ------------------------------------------------------------------
export type { DataGridEditingOptions, DataGridProps, DataSource } from "./grid/types";
export type { ColumnSizingState } from "@tanstack/react-table";
export { DataGrid } from "./grid/DataGrid";
export type { GridStateController } from "./grid/useGridState";
export { useGridState } from "./grid/useGridState";
export { processClientData } from "./grid/processClientData";
export type { ClientProcessingResult } from "./grid/processClientData";

// --- hooks -----------------------------------------------------------------
export type { DebouncedCallback } from "./hooks/useDebouncedCallback";
export { useDebouncedCallback } from "./hooks/useDebouncedCallback";

// --- tree grid ---------------------------------------------------------------
export type { TreeAccessors, TreeDataGridProps } from "./tree/types";
export { TreeDataGrid } from "./tree/TreeDataGrid";
export type { FlatTreeRow } from "./tree/flattenTree";
export { flattenTree } from "./tree/flattenTree";
export type { TreeStateController, UseTreeStateOptions } from "./tree/useTreeState";
export { useTreeState } from "./tree/useTreeState";
