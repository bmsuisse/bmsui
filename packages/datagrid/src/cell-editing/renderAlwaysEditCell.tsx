import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { defaultFormat } from "../column/format";
import type { ColumnDef } from "../column/types";
import { isEditable } from "../column/types";
import { EnumEditor } from "../edit/EnumEditor";
import { renderDefaultEditWidget } from "../edit/registry";
import { isAtomicEditorType } from "./renderCellModeCell";
import type { CellEditingCellContext } from "./useCellEditingState";

/**
 * Bridges an atomic (enum/boolean/date/datetime) `AlwaysEditCell`'s own
 * gesture handling back into `<DataGrid>`'s shared cell-selection state —
 * needed only because these cells' widgets are permanently-mounted, LIVE
 * controls (a Radix `<Select>` trigger, a checkbox), unlike a non-atomic
 * editor's plain `<input>`, so a mouse gesture that's supposed to just
 * select the cell (shift+click, or a drag) can otherwise be swallowed or
 * misinterpreted by the widget's own native mouse handling before
 * `<DataGrid>`'s own delegated `onMouseDown` ever sees it. See
 * `AlwaysEditCell`'s own capture-phase handlers for the mechanics.
 */
export interface AtomicGestureContext {
  /**
   * True for exactly the one built-in enum (`<Select>`) cell that should
   * open its dropdown now. Set by `<DataGrid>`'s own mouseup handler the
   * instant a mousedown/mouseup pair on it resolves to a plain,
   * non-extended, non-dragged click — the only case its native
   * open-on-pointerdown/click is supposed to happen at all.
   *
   * This exists because `AlwaysEditCell` unconditionally suppresses that
   * native behavior while a built-in enum widget is closed (see its own
   * `onPointerDownCapture` doc): unlike the other atomic types, a `<Select>`
   * also supports a native "press, drag to an option, release to pick it"
   * gesture — letting it open immediately on ANY mousedown (as Radix does
   * by default) means a drag that merely passes through its now-open
   * popover can silently commit the wrong option as this cell's value,
   * not just steal the range-select gesture. A plain click needs this
   * signal as its own way back in once that's blocked.
   */
  shouldOpenEnum: (rowId: string, columnId: string) => boolean;
  /**
   * Consumes the one-shot "open this cell's dropdown" signal `shouldOpenEnum`
   * reports as `true` — called by `AlwaysEditCell` the instant it actually
   * acts on it (opens itself), so the signal doesn't linger and re-trigger a
   * later, unrelated re-render of this same cell. That "unrelated re-render"
   * isn't hypothetical: it's a genuine remount, not just an ordinary update —
   * a value commit elsewhere in the same gesture (see `AlwaysEditCell.commit`)
   * routes back through the consumer's own state, and a consumer that
   * doesn't memoize its `columns` array hands `<DataGrid>` a new reference on
   * that very re-render, busting the `tanstackColumns` memo and rebuilding
   * every column's `cell` closure — a different component `type` at this
   * cell's tree position, which React remounts. A fresh mount has no
   * "previous deps" to compare `shouldOpenEnum`'s value against, so without
   * this, a still-`true` (never-cleared) signal reopens the dropdown right
   * back up every time, forever. No-ops if `rowId`/`columnId` no longer match
   * the pending cell (a newer click already replaced it).
   */
  consumeOpenEnum: (rowId: string, columnId: string) => void;
  /**
   * Registers this gesture's selection directly. Required because
   * `AlwaysEditCell` suppresses a widget's native pointerdown handling by
   * calling `preventDefault()` on it — and per the Pointer Events spec,
   * that ALSO cancels the browser's own compatibility `mousedown` event for
   * this same gesture, so `<DataGrid>`'s own delegated `onMouseDown`
   * handler (which is what normally calls this) never runs for it at all.
   */
  registerSelection: (rowId: string, columnId: string, extend: boolean) => void;
}

/**
 * One in-progress, uncommitted edit this component started itself.
 * `baseline` is `resolvedValue` at the moment the draft was last updated —
 * the same freshness convention `useCellEditingState`'s own `CellOverride`
 * uses, applied locally: as long as `resolvedValue` still equals `baseline`,
 * nothing else has touched this cell since, so `value` is still the right
 * thing to show/commit. The instant `resolvedValue` diverges from
 * `baseline` (a fill-drag or paste landed on this exact cell while a draft
 * was in progress), the draft is stale and must lose to that newer value —
 * committing it anyway would silently revert whatever just landed.
 */
interface LocalDraft {
  value: unknown;
  baseline: unknown;
}

/**
 * Renders one cell under `cellEditing.alwaysEdit` mode: every editable cell
 * gets its own permanently-mounted editor, all simultaneously — unlike
 * `renderCellModeCell`'s single shared `editingCell` slot (at most one editor
 * open at a time), this component owns its OWN local draft state, since with
 * every cell independently editable there's no single "the" cell to hang a
 * shared draft off of. A buffered (string/number/currency) editor still only
 * commits on blur/Enter/Tab, same as click-to-edit mode — this only changes
 * WHEN the editor first appears (always, not on click/double-click/F2/typed
 * character), not how a buffered edit gets committed.
 */
export function AlwaysEditCell<TRow>(props: {
  column: ColumnDef<TRow>;
  row: TRow;
  rawValue: unknown;
  ctx: CellEditingCellContext<TRow>;
  /** Only meaningful for an atomic column type — see `AtomicGestureContext`'s own doc. */
  atomicGesture?: AtomicGestureContext;
}): ReactNode {
  const { column, row, rawValue, ctx, atomicGesture } = props;
  const rowId = ctx.getRowId(row);
  const resolvedValue = ctx.resolveValue(rowId, column.id, rawValue);
  // Called unconditionally, before the `isEditable` early return below —
  // `column.editable` can be a per-row predicate (see `isEditable` in
  // `column/types.ts`), so whether this cell renders an editor at all can
  // differ between renders of the very same component instance; a hook
  // can't sit after a conditional return that's conditional on that.
  const [draft, setDraft] = useState<LocalDraft | undefined>(undefined);
  // The built-in enum widget's own open/closed state, owned here (not by
  // `<Select>` itself) specifically so a mousedown/click can be
  // unconditionally suppressed while it's closed — see `AtomicGestureContext`'s
  // own doc for why. Irrelevant (never read) for every other column type.
  const [enumOpen, setEnumOpen] = useState(false);
  const isBuiltinEnum = column.type === "enum" && !column.renderEditCell;
  const shouldOpenEnumNow = isBuiltinEnum && (atomicGesture?.shouldOpenEnum(rowId, column.id) ?? false);
  // Opens it exactly once per `<DataGrid>`-confirmed plain click. Relying
  // solely on this effect's own dependency array to make that "exactly
  // once" is NOT enough: a value commit elsewhere in the same gesture (see
  // `commit` below) routes back through the consumer's own state (e.g.
  // `cellEditing.onCellsChange`), and a consumer that doesn't memoize its
  // `columns` array (the common case — see `toTanstackColumns`'s own doc for
  // why that matters) hands `<DataGrid>` a brand-new `columns` reference on
  // that very re-render, which busts the `tanstackColumns` memo and rebuilds
  // every column's `cell` closure — a genuinely different component `type`
  // at this cell's tree position, which remounts `AlwaysEditCell` outright.
  // A fresh mount has no "previous deps" to compare against, so it runs this
  // effect regardless of whether `shouldOpenEnumNow`'s VALUE actually
  // changed — and since `pendingOpenEnumCell` (`shouldOpenEnum`'s backing
  // state) was never cleared, the remounted instance sees it as still `true`
  // and reopens. `consumeOpenEnum` closes that hole by clearing the signal
  // the instant it's acted on, so a subsequent remount (or any other re-run
  // of this effect) sees `shouldOpenEnumNow` as `false` and stays closed —
  // making this a true one-shot signal instead of merely relying on the
  // dependency array, which a remount bypasses entirely.
  useEffect(() => {
    if (!shouldOpenEnumNow) return;
    setEnumOpen(true);
    atomicGesture?.consumeOpenEnum(rowId, column.id);
  }, [shouldOpenEnumNow]);

  if (!isEditable(column, row)) {
    return (
      <span data-testid={`cell-${rowId}-${column.id}`} className="block w-full">
        {column.cell ? column.cell(resolvedValue, row) : defaultFormat(column, resolvedValue)}
      </span>
    );
  }

  const isAtomic = isAtomicEditorType(column.type);
  const error = ctx.getError(rowId, column.id);
  // Fresh only while `resolvedValue` still matches what it was when `draft`
  // was last updated — see `LocalDraft`'s own doc. A stale draft is treated
  // as if there were none: `currentValue` falls through to `resolvedValue`,
  // and the commit paths below refuse to commit it. Left in state rather
  // than cleared outright — recomputing this each render is enough to keep
  // display/commit correct without an extra render just to null it out.
  const draftIsFresh = draft !== undefined && resolvedValue === draft.baseline;
  const currentValue = draftIsFresh ? draft!.value : resolvedValue;

  function validate(candidate: unknown): string | undefined {
    return column.validateEdit?.(candidate, row);
  }

  function commit(value: unknown): void {
    ctx.applyChange({ rowId, row, columnId: column.id, previousValue: resolvedValue, value });
    setDraft(undefined);
  }

  const onChange = (next: unknown): void => {
    const message = validate(next);
    ctx.onSetError(rowId, column.id, message);
    if (isAtomic && !message) {
      commit(next);
      return;
    }
    setDraft({ value: next, baseline: resolvedValue });
  };

  function handleKeyDown(event: ReactKeyboardEvent): void {
    if (event.key === "Escape") {
      event.stopPropagation();
      ctx.onSetError(rowId, column.id, undefined);
      setDraft(undefined);
      return;
    }
    const isMultilineNewline = column.type === "string" && column.multiline && event.key === "Enter" && event.shiftKey;
    if (isMultilineNewline) return;
    if (isAtomic || (event.key !== "Enter" && event.key !== "Tab")) return;
    if (!draftIsFresh) return; // nothing (still) pending — no-op close, matches renderCellModeCell's own onCommitEdit convention
    const message = validate(draft!.value);
    if (message) {
      event.stopPropagation();
      return;
    }
    commit(draft!.value);
  }

  function handleBlur(): void {
    if (isAtomic || !draftIsFresh) return;
    if (validate(draft!.value)) setDraft(undefined);
    else commit(draft!.value);
  }

  // `stopPropagation()` alone does NOT stop Radix's own handlers on the
  // widget from still firing here — React dispatches capture- and
  // bubble-phase handlers off separate root-level native listeners, so a
  // synthetic `stopPropagation()` called from a CAPTURE handler only halts
  // React's own capture-side traversal, not the independent bubble-side one
  // that would still reach the widget's own bubble-phase prop. Only
  // stopping the underlying native event itself reliably prevents that
  // (verified against a live Radix `<Select>` trigger). Shared by both
  // capture handlers below. Returns `true` when it actually suppressed
  // anything, so callers know whether to also call `registerSelection`.
  function suppressNative(event: ReactPointerEvent | ReactMouseEvent): boolean {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    return true;
  }

  // Modifier-only interception, for atomic widgets OTHER than the built-in
  // enum editor (which gets the stronger, always-while-closed interception
  // below instead): a shift/ctrl/meta-held click meant to just select the
  // cell would otherwise still reach the widget's own native click handling
  // (a checkbox's toggle, or focusing a native date input) — Radix/native
  // controls don't know to treat those modifiers as "don't act, just
  // select" the way this grid does. These don't cover nearby rows with a
  // draggable popover the way `<Select>` does, so a PLAIN drag starting on
  // one of them already resolves correctly with no interception needed at
  // all — nothing here ever eclipses `event.target` during it.
  function handleModifierCapture(event: ReactPointerEvent | ReactMouseEvent): boolean {
    if (!isAtomic || isBuiltinEnum) return false;
    if (!(event.shiftKey || event.ctrlKey || event.metaKey)) return false;
    return suppressNative(event);
  }

  // Unconditional (any gesture, not just modifier-held) interception for a
  // CLOSED built-in enum editor — see `AtomicGestureContext.shouldOpenEnum`'s
  // own doc for why a plain click can't just be let through immediately the
  // way it can for the other atomic types above: a `<Select>` that's
  // allowed to open on ANY plain mousedown also lets a drag starting on it
  // silently commit whichever option the drag happens to end up over.
  // Once open, this stops intercepting entirely — closing it again (click
  // the trigger, pick an option, click away, Escape) is left to Radix's own
  // normal behavior, via `onOpenChange={setEnumOpen}` below.
  function handleEnumOpenCapture(event: ReactPointerEvent | ReactMouseEvent): boolean {
    if (!isBuiltinEnum || enumOpen) return false;
    return suppressNative(event);
  }

  // Pointerdown, not just click: this is also where a suppressed gesture's
  // selection gets registered (see `AtomicGestureContext.registerSelection`'s
  // own doc for why `<DataGrid>`'s own mousedown handler can't be trusted to
  // still run on its own here) — pointerdown, rather than the later click,
  // since a real drag never produces a `click` at all (mouseup lands on a
  // different cell than mousedown), but still needs its start cell
  // registered as the selection's anchor.
  function handlePointerDownCapture(event: ReactPointerEvent): void {
    const suppressed = handleModifierCapture(event) || handleEnumOpenCapture(event);
    if (suppressed) atomicGesture?.registerSelection(rowId, column.id, event.shiftKey);
  }

  // A SEPARATE interception from the pointerdown one above, and just as
  // required: Radix's `<Select>` trigger also opens from its own `onClick`
  // handler, but only when `pointerType !== "mouse"` (its own touch
  // fallback) — and that internal pointer-type tracking is itself only
  // ever updated inside the very `onPointerDown` handler this file
  // suppresses, so once that's blocked, the trigger's `pointerType` gets
  // stuck at Radix's own initial default ("touch"), and its `onClick`
  // fallback opens the dropdown anyway on the ensuing native `click`
  // (mousedown+mouseup on the same target) if this isn't ALSO suppressed.
  // No `registerSelection` here — `handlePointerDownCapture` above already
  // covers it, and click fires (if at all) strictly after pointerdown for
  // the same gesture.
  function handleClickCapture(event: ReactMouseEvent): void {
    handleModifierCapture(event);
    handleEnumOpenCapture(event);
  }

  return (
    <fieldset
      disabled={ctx.disabled}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPointerDownCapture={handlePointerDownCapture}
      onClickCapture={handleClickCapture}
      className="contents"
    >
      {column.type === "enum" && !column.renderEditCell ? (
        <EnumEditor
          column={column}
          rowId={rowId}
          value={currentValue}
          onChange={onChange}
          error={error}
          autoFocus={false}
          open={enumOpen}
          onOpenChange={setEnumOpen}
        />
      ) : column.renderEditCell ? (
        column.renderEditCell(currentValue, row, onChange, error, false)
      ) : (
        renderDefaultEditWidget(column, rowId, currentValue, onChange, error, false)
      )}
    </fieldset>
  );
}
