/**
 * Fixed pixel width of the selection-checkbox column both `<DataGrid>` and
 * `<TreeDataGrid>` render themselves, matched by the `width` style applied
 * to the column's own header/body cells. 36px (the shared `Button`'s
 * `size="icon"`) plus 4px of padding on each side — big enough to comfortably
 * hit WCAG's 44px minimum touch target.
 */
export const SELECTION_COLUMN_WIDTH = 44;
