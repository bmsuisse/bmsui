---
title: Cell editing (spreadsheet mode)
---

# Cell editing (spreadsheet mode)

`cellEditing` (a prop on `<DataGrid>`) turns on "true spreadsheet" editing:
click or type directly into any `editable` cell, drag (or shift+click/
shift+arrow) to range-select, copy/paste a range, drag a fill-handle to
extend a pattern — every change applies immediately, with no row-level
Save/Discard gate. This is a **different, mutually exclusive** state machine
from [inline editing](/datagrid/inline-editing)'s accumulate-then-save
`editing` prop — set at most one of the two; `editing` is ignored once
`cellEditing` is set.

```tsx
<DataGrid
  columns={columns}
  dataSource={{ mode: "client", data: tasks }}
  getRowId={(row) => row.id}
  cellEditing={{
    onCellsChange: (changes) => {
      // changes: CellChange<Task>[] — one entry per changed cell, one call
      // per gesture (a single keystroke commit, a paste, or a fill-drag).
      setTasks((prev) =>
        prev.map((task) => {
          const rowChanges = changes.filter((c) => c.rowId === task.id);
          if (rowChanges.length === 0) return task;
          const patch = Object.fromEntries(rowChanges.map((c) => [c.columnId, c.value]));
          return { ...task, ...patch };
        }),
      );
    },
  }}
/>
```

Mark whichever columns should be editable, same as `editing` mode:

```tsx
const columns: ColumnDef<Task>[] = [
  { id: "title", type: "string", header: "Task", accessorKey: "title", editable: true },
  { id: "owner", type: "enum", header: "Owner", accessorKey: "owner", editable: true, options: [...] },
  { id: "hours", type: "number", header: "Est. hours", accessorKey: "hours", editable: true },
  { id: "done", type: "boolean", header: "Done", accessorKey: "done", editable: true },
];
```

A column with `editable` set but no `cellEditing`/`editing` prop on
`<DataGrid>` just renders as static text, same as if `editable` were never
set.

## `onCellsChange` — what you get, and when

```ts
interface CellChange<TRow> {
  rowId: string;
  row: TRow;              // the row as it looked at the moment of the change
  columnId: string;
  previousValue: unknown;
  value: unknown;
}

interface CellEditingOptions<TRow> {
  onCellsChange: (changes: CellChange<TRow>[]) => void | Promise<void>;
  disabled?: boolean;
}
```

`onCellsChange` fires once per gesture — one typed-cell commit, one paste, one
fill-drag — with every cell that gesture changed. There's no debouncing: a
single keystroke commit is one `[change]`; pasting or filling a 50-cell block
is one call with 50 entries. A paste/fill spanning multiple columns for the
same row produces multiple entries sharing one `rowId` — merge **all** of a
row's entries, not just the first one.

**Fire-and-forget: there's no pending state to roll back to.** Unlike
`editing`'s `onSave`, a rejection here does not undo the grid's own local
display of the new value — show your own error UI (a toast, etc.) if a
change needs to be surfaced as failed. Once your own `data` catches up to
reflect an accepted (or server-normalized) value, the grid trusts that real
data again over its own optimistic echo.

`disabled` blocks all cell-editing interaction — e.g. while a previous
gesture's `onCellsChange` is still in flight.

## Selecting cells

- **Click** a cell to select it as a single-cell range.
- **Drag**, or **shift+click**, extends the selection to a rectangle between
  the anchor (where the drag/first click started) and the new cell.
- **Arrow keys** move the selection by one row/column; **shift+arrow**
  extends it instead of moving it, keeping the same anchor.
- **Tab** / **shift+Tab** moves right/left; **Enter** moves down — same as
  the equivalent key would in Excel once a cell is no longer being edited.

## Editing a cell

- **Double-click**, or **F2**, opens the selected cell's editor starting from
  its current value.
- **Typing any printable character directly** also opens the editor, but
  *replaces* the cell's value with what was typed, rather than appending to
  it — Excel's own "just start typing" gesture.
- The same per-`type` default editors as `editing` mode (text input, number
  input, checkbox, enum select, date/datetime input) apply here, including
  the same `renderEditCell`/`validateEdit` overrides described in
  [Inline editing](/datagrid/inline-editing).
- An enum/boolean/date/datetime editor commits **immediately** on selection —
  there's no separate confirm step, matching how a dropdown or checkbox cell
  behaves in a real spreadsheet. A string/number/currency editor instead
  buffers keystrokes and commits on blur, Enter, or Tab.
- **Escape** reverts the cell being edited to its pre-edit value without
  committing.
- A failed `validateEdit` blocks an Enter/Tab commit (the cell stays open,
  showing the error) and blocks a blur-commit by reverting instead.

## Copy and paste

`Ctrl`/`Cmd`+`C` copies the current selection as Excel-compatible
tab/newline-delimited text — round-trips cleanly with a real spreadsheet
paste. Each cell's copied text is `column.formatForClipboard?.(value, row)`
if supplied, else the same display text the grid already renders
(`column.cell` / `defaultFormat`) — override `formatForClipboard` for a
column whose custom `cell` renders something other than a faithful
plain-text value (a badge/icon, say).

`Ctrl`/`Cmd`+`V` pastes over the current selection:

- **A single copied value** fills every cell in the current selection,
  however large — the same behavior a real spreadsheet has for pasting one
  value onto a multi-cell selection.
- **A multi-cell block** anchors at the selection's top-left corner and
  extends to match the pasted shape, clipped to the grid's bounds.
- Each pasted string is coerced to the target column's `type` (numbers,
  booleans (`true`/`yes`/`1` etc.), dates, and enum values matched by value
  first then by label) — a cell that doesn't coerce (e.g. `"abc"` into a
  number column) is silently skipped rather than committed as `NaN`/invalid.
- A non-editable or missing target cell is silently skipped.
- While a cell is actively being edited, copy/paste instead targets that
  cell's own `<input>` (ordinary browser behavior), not a range operation.

## Fill handle

Once there's a selection, a small square appears at its bottom-right corner
(only when not already dragging, and no cell is being edited). Drag it to
extend the selection in one direction — the fill preview axis-locks to
whichever of up/down/left/right you've dragged furthest toward.

Releasing the drag copies the source range's values into every newly-covered
cell, **tiling the source pattern** if the extension is longer than the
source itself (e.g. dragging a 2-row selection down by 6 rows repeats the
2-row pattern three times) — a single-cell source is the degenerate case:
every new cell just copies that one value. This is value-copy only, with no
numeric/date auto-increment. A target cell that's missing, not editable, or
whose source cell is missing is silently skipped.

## Limitations

- **No numeric/date series auto-increment on fill** — only value-copy and
  pattern-tiling, unlike Excel's `1, 2, 3…`-style fill for a numeric
  sequence.
- **No undo/redo** — every change applies immediately and there's no history
  to step back through. (`CellChange.previousValue` is already carried on
  every change for exactly this reason, so undo/redo can be built on top of
  `onCellsChange`'s log without a breaking API change later — it's just not
  implemented yet.)
- **Not supported together with `groupBy`** — setting both leaves
  `cellEditing` inert (as if it were never set) rather than erroring.
- **Not available on `<TreeDataGrid>`** — only the row-batch `editing` prop
  is; see [Inline editing](/datagrid/inline-editing#limitations) for its
  tree support.
